import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase";
import { apiError, requireRole, withErrorHandling, HTTP_STATUS } from "@/app/api/_shared";
import { MVP_ORG_ID } from "@/app/api/auth/_constants";
import {
  normalizePermissionMap,
  getGerenciaPermissionOverride,
  BUILTIN_ROLE_PERMISSIONS,
} from "@/lib/permissions";

/**
 * GET /api/admin/role-permissions — permisos configurados actualmente para
 * el rol `gerencia` (o el default EDIT_ALL si el admin nunca los guardó).
 * PUT /api/admin/role-permissions — guarda/actualiza esos permisos. Ambos
 * SOLO admin -- gerencia no puede tocar sus propios permisos (evitaría el
 * control de acceso que este endpoint existe para dar).
 *
 * Solo soporta el rol `gerencia` por ahora: `admin` es superusuario fijo,
 * `cliente`/`asesor` tienen defaults hardcodeados, y roles personalizados
 * ya se gestionan en /api/admin/custom-roles.
 */
export const GET = withErrorHandling(async () => {
  const auth = await requireRole(["admin"]);
  if (!auth.authorized) return auth.response;

  const permissions = (await getGerenciaPermissionOverride()) ?? BUILTIN_ROLE_PERMISSIONS.gerencia;
  return NextResponse.json({ role: "gerencia", permissions });
});

type UpdateBody = { permissions?: Record<string, unknown> };

export const PUT = withErrorHandling(async (request: Request) => {
  const auth = await requireRole(["admin"]);
  if (!auth.authorized) return auth.response;

  const body = (await request.json().catch(() => null)) as UpdateBody | null;
  if (!body?.permissions) {
    return apiError("permissions es requerido", HTTP_STATUS.BAD_REQUEST, "INVALID_BODY");
  }

  const permissions = normalizePermissionMap(body.permissions);
  const supabase = createSupabaseServiceRoleClient() as any;

  const { data, error } = await supabase
    .from("role_permissions")
    .upsert(
      { org_id: MVP_ORG_ID, role: "gerencia", permissions, updated_at: new Date().toISOString() },
      { onConflict: "org_id,role" }
    )
    .select("permissions")
    .single();

  if (error) {
    return apiError(error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR, "ROLE_PERMISSIONS_UPDATE_FAILED");
  }

  return NextResponse.json({ role: "gerencia", permissions: data.permissions });
});
