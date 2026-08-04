import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase";
import { apiError, requireRole, withErrorHandling, HTTP_STATUS, type UserRole } from "@/app/api/_shared";
import { MVP_ORG_ID } from "@/app/api/auth/_constants";

/** Igual que en ../route.ts -- qué roles puede gestionar cada creador. */
const MANAGEABLE_ROLES_BY_CREATOR: Record<string, UserRole[]> = {
  admin: ["asesor", "gerencia", "custom"],
  gerencia: ["asesor"],
};

type PasswordBody = { password?: string };

/**
 * POST /api/admin/users/{id}/password — cambia la contraseña de un usuario
 * de backend. SOLO admin (gerencia no puede cambiar contraseñas ajenas,
 * mismo control de acceso que la edición de datos -- ver PATCH en
 * ../route.ts). No requiere la contraseña anterior: es un reseteo
 * administrativo, no un cambio de contraseña propio (para eso existe
 * ChangePasswordDialog).
 */
export const POST = withErrorHandling(async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const auth = await requireRole(["admin"]);
  if (!auth.authorized) return auth.response;

  const { id } = await context.params;
  if (id === auth.user.id) {
    return apiError("Usa 'Cambiar contraseña' en tu menú de cuenta para tu propia cuenta", HTTP_STATUS.FORBIDDEN, "CANNOT_SELF_MANAGE");
  }

  const body = (await request.json().catch(() => null)) as PasswordBody | null;
  if (!body?.password || body.password.length < 8) {
    return apiError("La contraseña debe tener al menos 8 caracteres", HTTP_STATUS.BAD_REQUEST, "PASSWORD_TOO_SHORT");
  }

  const supabase = createSupabaseServiceRoleClient() as any;

  const { data: target, error: findError } = await supabase
    .from("users")
    .select("id, role")
    .eq("id", id)
    .eq("org_id", MVP_ORG_ID)
    .maybeSingle();
  if (findError) {
    return apiError(findError.message, HTTP_STATUS.INTERNAL_SERVER_ERROR, "USER_FETCH_FAILED");
  }
  if (!target) {
    return apiError("Usuario no encontrado", HTTP_STATUS.NOT_FOUND, "USER_NOT_FOUND");
  }

  const manageableRoles = MANAGEABLE_ROLES_BY_CREATOR[auth.role] ?? [];
  if (!manageableRoles.includes(target.role as UserRole)) {
    return apiError(
      `Tu rol (${auth.role}) no puede gestionar cuentas con rol "${target.role}"`,
      HTTP_STATUS.FORBIDDEN,
      "ROLE_NOT_MANAGEABLE"
    );
  }

  const { error: updateError } = await supabase.auth.admin.updateUserById(id, { password: body.password });
  if (updateError) {
    return apiError(updateError.message, HTTP_STATUS.INTERNAL_SERVER_ERROR, "PASSWORD_UPDATE_FAILED");
  }

  return NextResponse.json({ ok: true });
});
