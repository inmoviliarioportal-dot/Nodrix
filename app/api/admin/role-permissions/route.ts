import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase";
import { apiError, requireRole, withErrorHandling, HTTP_STATUS } from "@/app/api/_shared";
import { MVP_ORG_ID } from "@/app/api/auth/_constants";
import {
  normalizePermissionMap,
  getRolePermissionOverride,
  getAllRolePermissionOverrides,
  isConfigurableRole,
  CONFIGURABLE_ROLES,
  BUILTIN_ROLE_PERMISSIONS,
  type ConfigurableRole,
  type PermissionMap,
} from "@/lib/permissions";

/**
 * Configuración de permisos POR PERFIL (tabla `role_permissions`).
 * Ambos verbos son SOLO admin -- gerencia/asesor no pueden tocar sus propios
 * permisos (eso anularía el control de acceso que este endpoint existe para dar).
 *
 * Perfiles configurables: `asesor` y `gerencia` (ver CONFIGURABLE_ROLES).
 *
 * ⚠️ `admin` NO es configurable, ni por este endpoint ni por ninguna otra vía:
 * es superusuario y el único rol capaz de abrir /admin/roles. Restringirlo
 * permitiría dejar el sistema sin nadie que pueda administrarlo. Intentarlo
 * devuelve 400 ADMIN_NOT_CONFIGURABLE.
 *
 * GET  /api/admin/role-permissions            -> { roles: RolePermissionsEntry[], role, permissions }
 * GET  /api/admin/role-permissions?role=asesor -> RolePermissionsEntry
 * PUT  /api/admin/role-permissions            body { role?, permissions } -> RolePermissionsEntry
 * POST idem PUT.
 *
 * RolePermissionsEntry = {
 *   role: "asesor" | "gerencia" | "admin",
 *   configurable: boolean,   // false para admin
 *   hasOverride: boolean,    // true si hay fila guardada en role_permissions
 *   permissions: PermissionMap,  // efectivo (override si hay, si no el default)
 *   defaults: PermissionMap      // el default del rol, para el botón "restaurar"
 * }
 *
 * `admin` aparece en la lista del GET (con configurable:false) para que la UI
 * pueda mostrarlo en modo lectura y explicar por qué no se edita, en vez de
 * ocultarlo y dejar al admin preguntándose dónde está.
 *
 * Los campos `role`/`permissions` de nivel superior en el GET sin parámetro son
 * LEGADO (forma anterior, solo-gerencia) y se mantienen para no romper clientes
 * viejos; usar `roles` en código nuevo.
 */

type RolePermissionsEntry = {
  role: ConfigurableRole | "admin";
  configurable: boolean;
  hasOverride: boolean;
  permissions: PermissionMap;
  defaults: PermissionMap;
};

const ADMIN_ENTRY: RolePermissionsEntry = {
  role: "admin",
  configurable: false,
  hasOverride: false,
  permissions: BUILTIN_ROLE_PERMISSIONS.admin,
  defaults: BUILTIN_ROLE_PERMISSIONS.admin,
};

function entryFor(role: ConfigurableRole, override: PermissionMap | null | undefined): RolePermissionsEntry {
  return {
    role,
    configurable: true,
    hasOverride: Boolean(override),
    permissions: override ?? BUILTIN_ROLE_PERMISSIONS[role],
    defaults: BUILTIN_ROLE_PERMISSIONS[role],
  };
}

/** Valida el rol pedido/enviado. Devuelve el rol o una respuesta de error.
 * `admin` recibe un código propio (ADMIN_NOT_CONFIGURABLE) en vez de
 * INVALID_ROLE: no es un typo, es una decisión de diseño que la UI debe
 * poder explicar al usuario. */
function resolveRole(raw: unknown): { role: ConfigurableRole } | { response: ReturnType<typeof apiError> } {
  if (raw === "admin") {
    return {
      response: apiError(
        "El perfil 'admin' es superusuario y sus permisos no son configurables.",
        HTTP_STATUS.BAD_REQUEST,
        "ADMIN_NOT_CONFIGURABLE"
      ),
    };
  }
  if (!isConfigurableRole(raw)) {
    return {
      response: apiError(
        `role inválido. Perfiles configurables: ${CONFIGURABLE_ROLES.join(", ")}.`,
        HTTP_STATUS.BAD_REQUEST,
        "INVALID_ROLE"
      ),
    };
  }
  return { role: raw };
}

export const GET = withErrorHandling(async (request: Request) => {
  const auth = await requireRole(["admin"]);
  if (!auth.authorized) return auth.response;

  const requested = new URL(request.url).searchParams.get("role");

  if (requested) {
    if (requested === "admin") return NextResponse.json(ADMIN_ENTRY);
    const resolved = resolveRole(requested);
    if ("response" in resolved) return resolved.response;
    const override = await getRolePermissionOverride(resolved.role);
    return NextResponse.json(entryFor(resolved.role, override));
  }

  const overrides = await getAllRolePermissionOverrides();
  const roles: RolePermissionsEntry[] = [
    ...CONFIGURABLE_ROLES.map((role) => entryFor(role, overrides[role])),
    ADMIN_ENTRY,
  ];

  const gerencia = roles.find((entry) => entry.role === "gerencia")!;
  // `role`/`permissions`: forma legada (solo-gerencia). Ver comentario arriba.
  return NextResponse.json({ roles, role: "gerencia", permissions: gerencia.permissions });
});

type UpdateBody = { role?: unknown; permissions?: Record<string, unknown> };

const save = withErrorHandling(async (request: Request) => {
  const auth = await requireRole(["admin"]);
  if (!auth.authorized) return auth.response;

  const body = (await request.json().catch(() => null)) as UpdateBody | null;
  if (!body?.permissions) {
    return apiError("permissions es requerido", HTTP_STATUS.BAD_REQUEST, "INVALID_BODY");
  }

  // `role` ausente -> "gerencia": compatibilidad con el cliente viejo, que
  // solo sabía configurar gerencia y no mandaba el campo.
  const resolved = resolveRole(body.role ?? "gerencia");
  if ("response" in resolved) return resolved.response;
  const { role } = resolved;

  const permissions = normalizePermissionMap(body.permissions);
  const supabase = createSupabaseServiceRoleClient() as any;

  const previous = await getRolePermissionOverride(role);

  const { data, error } = await supabase
    .from("role_permissions")
    .upsert(
      { org_id: MVP_ORG_ID, role, permissions, updated_at: new Date().toISOString() },
      { onConflict: "org_id,role" }
    )
    .select("id, permissions")
    .single();

  if (error) {
    return apiError(error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR, "ROLE_PERMISSIONS_UPDATE_FAILED");
  }

  // Auditoría: cambiar permisos de un perfil altera lo que ve TODO usuario
  // asociado a él, así que queda registrado quién lo hizo y qué cambió.
  await supabase.from("audit_events").insert({
    org_id: MVP_ORG_ID,
    entity_type: "role_permissions",
    entity_id: data.id,
    action: "update_role_permissions",
    actor_user_id: auth.user.id,
    before: previous ? { role, permissions: previous } : null,
    after: { role, permissions },
  });

  return NextResponse.json({
    ...entryFor(role, normalizePermissionMap(data.permissions)),
    // Campo legado de la forma anterior de respuesta.
    permissions: normalizePermissionMap(data.permissions),
  });
});

export const PUT = save;
export const POST = save;
