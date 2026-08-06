import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase";
import { apiError, requireRole, withErrorHandling, HTTP_STATUS } from "@/app/api/_shared";
import { MVP_ORG_ID } from "@/app/api/auth/_constants";
import { PERMISSION_MODULES, type PermissionModule } from "@/lib/permissions";
import { createGrant, revokeGrant } from "@/lib/temporary-grants";

/**
 * Permisos TEMPORALES por usuario (tabla `user_permission_grants`,
 * migración 037). SOLO admin en los tres verbos: quien puede otorgar acceso
 * extra tiene que ser el superusuario, o sería una escalada de privilegios.
 *
 * Recordatorio de la regla de negocio: un grant SOLO ELEVA el nivel que ya da
 * el perfil del usuario (none -> view/edit, view -> edit). Nunca restringe.
 */

type GrantRow = {
  id: string;
  user_id: string;
  permission_key: string;
  level: string;
  granted_by: string;
  reason: string;
  starts_at: string;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
};

/** Estado derivado en el momento de leer, no almacenado: `expired` se calcula
 * comparando `expires_at` con ahora, sin depender de ningún job. */
type GrantStatus = "active" | "scheduled" | "expired" | "revoked";

function statusOf(row: GrantRow, now: number): GrantStatus {
  if (row.revoked_at) return "revoked";
  if (new Date(row.expires_at).getTime() <= now) return "expired";
  if (new Date(row.starts_at).getTime() > now) return "scheduled";
  return "active";
}

/**
 * GET /api/admin/permission-grants
 *   ?userId=<uuid>  -> todos los grants de ese usuario (vigentes e históricos)
 *   (sin userId)    -> por defecto solo los VIGENTES de la organización;
 *                      agrega `?includeInactive=1` para traer también los
 *                      vencidos y revocados.
 *
 * Respuesta: `{ grants: [{ id, userId, userEmail, userName, permissionKey,
 * level, reason, startsAt, expiresAt, revokedAt, status, grantedBy:
 * { id, email, fullName } }] }`
 */
export const GET = withErrorHandling(async (request: Request) => {
  const auth = await requireRole(["admin"]);
  if (!auth.authorized) return auth.response;

  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");
  const includeInactive =
    url.searchParams.get("includeInactive") === "1" || url.searchParams.get("includeInactive") === "true";

  const nowIso = new Date().toISOString();
  const supabase = createSupabaseServiceRoleClient() as any;

  let query = supabase
    .from("user_permission_grants")
    .select(
      "id, user_id, permission_key, level, granted_by, reason, starts_at, expires_at, revoked_at, created_at"
    )
    .eq("org_id", MVP_ORG_ID)
    .order("created_at", { ascending: false });

  if (userId) {
    // Historial completo del usuario: la UI necesita ver también lo vencido.
    query = query.eq("user_id", userId);
  } else if (!includeInactive) {
    query = query.is("revoked_at", null).gt("expires_at", nowIso);
  }

  const { data, error } = await query;
  if (error) {
    return apiError(error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR, "GRANTS_FETCH_FAILED");
  }

  const rows = (data ?? []) as GrantRow[];

  // Una sola consulta extra para resolver los nombres (destinatarios +
  // otorgantes juntos), en vez de un N+1 por fila.
  const userIds = Array.from(new Set(rows.flatMap((r) => [r.user_id, r.granted_by])));
  const usersById = new Map<string, { id: string; email: string; full_name: string | null }>();
  if (userIds.length > 0) {
    const { data: users } = await supabase
      .from("users")
      .select("id, email, full_name")
      .eq("org_id", MVP_ORG_ID)
      .in("id", userIds);
    for (const u of (users ?? []) as { id: string; email: string; full_name: string | null }[]) {
      usersById.set(u.id, u);
    }
  }

  const now = Date.now();
  const grants = rows.map((row) => {
    const target = usersById.get(row.user_id);
    const granter = usersById.get(row.granted_by);
    return {
      id: row.id,
      userId: row.user_id,
      userEmail: target?.email ?? null,
      userName: target?.full_name ?? null,
      permissionKey: row.permission_key,
      level: row.level,
      reason: row.reason,
      startsAt: row.starts_at,
      expiresAt: row.expires_at,
      revokedAt: row.revoked_at,
      createdAt: row.created_at,
      status: statusOf(row, now),
      grantedBy: {
        id: row.granted_by,
        email: granter?.email ?? null,
        fullName: granter?.full_name ?? null,
      },
    };
  });

  return NextResponse.json({ grants });
});

type CreateBody = {
  userId?: string;
  permissionKey?: string;
  level?: string;
  expiresAt?: string;
  reason?: string;
};

/**
 * POST /api/admin/permission-grants
 * Body: `{ userId, permissionKey, level: "view"|"edit", expiresAt (ISO futuro), reason }`
 * -> 201 `{ grant }`
 */
export const POST = withErrorHandling(async (request: Request) => {
  const auth = await requireRole(["admin"]);
  if (!auth.authorized) return auth.response;

  const body = (await request.json().catch(() => null)) as CreateBody | null;
  if (!body) return apiError("Body inválido", HTTP_STATUS.BAD_REQUEST, "INVALID_BODY");

  const { userId, permissionKey, level, expiresAt, reason } = body;

  if (!userId) return apiError("userId es requerido", HTTP_STATUS.BAD_REQUEST, "INVALID_BODY");

  if (!permissionKey || !(PERMISSION_MODULES as readonly string[]).includes(permissionKey)) {
    return apiError(
      `permissionKey debe ser uno de: ${PERMISSION_MODULES.join(", ")}`,
      HTTP_STATUS.BAD_REQUEST,
      "INVALID_PERMISSION_KEY"
    );
  }

  // 'none' se rechaza a propósito: los permisos temporales SOLO agregan
  // acceso, nunca lo quitan. Otorgar "nada" no significa nada.
  if (level !== "view" && level !== "edit") {
    return apiError(
      "level debe ser 'view' o 'edit' — los permisos temporales solo agregan acceso, nunca lo restringen",
      HTTP_STATUS.BAD_REQUEST,
      "INVALID_LEVEL"
    );
  }

  if (!reason || !reason.trim()) {
    return apiError(
      "reason es requerido: todo acceso extra debe quedar justificado por escrito",
      HTTP_STATUS.BAD_REQUEST,
      "MISSING_REASON"
    );
  }

  const expiresAtMs = expiresAt ? new Date(expiresAt).getTime() : NaN;
  if (!expiresAt || Number.isNaN(expiresAtMs)) {
    return apiError("expiresAt debe ser una fecha ISO válida", HTTP_STATUS.BAD_REQUEST, "INVALID_EXPIRES_AT");
  }
  if (expiresAtMs <= Date.now()) {
    return apiError(
      "expiresAt debe ser una fecha futura: un permiso sin vencimiento futuro no es temporal",
      HTTP_STATUS.BAD_REQUEST,
      "EXPIRES_AT_NOT_FUTURE"
    );
  }

  const supabase = createSupabaseServiceRoleClient() as any;
  const { data: target } = await supabase
    .from("users")
    .select("id, role")
    .eq("id", userId)
    .eq("org_id", MVP_ORG_ID)
    .maybeSingle();

  if (!target) {
    return apiError("El usuario destino no existe", HTTP_STATUS.BAD_REQUEST, "USER_NOT_FOUND");
  }
  if (target.role === "admin") {
    return apiError(
      "No tiene sentido dar un permiso temporal a un admin: ya tiene todos los permisos de forma permanente",
      HTTP_STATUS.BAD_REQUEST,
      "TARGET_IS_ADMIN"
    );
  }

  const result = await createGrant({
    userId,
    permissionKey: permissionKey as PermissionModule,
    level,
    reason: reason.trim(),
    expiresAt: new Date(expiresAtMs).toISOString(),
    grantedBy: auth.user.id,
  });

  if (!result.ok) {
    return apiError(result.error, HTTP_STATUS.INTERNAL_SERVER_ERROR, "GRANT_CREATE_FAILED");
  }

  return NextResponse.json({ grant: result.grant }, { status: 201 });
});

type DeleteBody = { id?: string; reason?: string };

/**
 * DELETE /api/admin/permission-grants?id=<uuid>  (o body `{ id, reason? }`)
 *
 * Revoca un grant antes de que venza. NO borra la fila: marca `revoked_at`
 * para conservar el historial de quién tuvo qué acceso y por qué.
 * -> `{ grant }`
 */
export const DELETE = withErrorHandling(async (request: Request) => {
  const auth = await requireRole(["admin"]);
  if (!auth.authorized) return auth.response;

  const url = new URL(request.url);
  const body = (await request.json().catch(() => null)) as DeleteBody | null;
  const id = url.searchParams.get("id") ?? body?.id ?? null;

  if (!id) {
    return apiError("id del permiso temporal es requerido", HTTP_STATUS.BAD_REQUEST, "MISSING_ID");
  }

  const result = await revokeGrant(id, auth.user.id, body?.reason);
  if (!result.ok) {
    return apiError(result.error, HTTP_STATUS.BAD_REQUEST, "GRANT_REVOKE_FAILED");
  }

  return NextResponse.json({ grant: result.grant });
});
