import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase";
import { apiError, requireRole, withErrorHandling, HTTP_STATUS, type UserRole } from "@/app/api/_shared";
import { MVP_ORG_ID } from "@/app/api/auth/_constants";
import { isValidRut, cleanRut } from "@/lib/rut";

/** Mismo set que en app/api/admin/users/route.ts -- quién puede GESTIONAR
 * (editar/deshabilitar) qué roles, no solo crearlos. Mantenerlo idéntico
 * evita que un creador pueda deshabilitar una cuenta que no podría crear. */
const MANAGEABLE_ROLES_BY_CREATOR: Record<string, UserRole[]> = {
  admin: ["asesor", "gerencia", "custom"],
  gerencia: ["asesor"],
};

type UpdateUserBody = {
  active?: boolean;
  firstName?: string;
  lastName?: string;
  phone?: string;
  rut?: string;
};

/**
 * PATCH /api/admin/users/{id} — mantenedor de usuarios de backend: permite
 * habilitar/deshabilitar una cuenta y editar sus datos de contacto. NUNCA
 * cambia el rol (eso requeriría re-evaluar permisos en cascada, fuera de
 * este endpoint) ni permite auto-gestionarse (evita que alguien se
 * deshabilite a sí mismo por error). Requiere admin/gerencia, y solo sobre
 * roles que ese creador podría crear (ver MANAGEABLE_ROLES_BY_CREATOR).
 */
export const PATCH = withErrorHandling(async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const auth = await requireRole(["admin", "gerencia"]);
  if (!auth.authorized) return auth.response;

  const { id } = await context.params;
  if (id === auth.user.id) {
    return apiError("No puedes modificar tu propia cuenta desde acá", HTTP_STATUS.FORBIDDEN, "CANNOT_SELF_MANAGE");
  }

  const body = (await request.json().catch(() => null)) as UpdateUserBody | null;
  if (!body || typeof body !== "object") {
    return apiError("Invalid JSON body", HTTP_STATUS.BAD_REQUEST, "INVALID_BODY");
  }

  const supabase = createSupabaseServiceRoleClient() as any;

  const { data: target, error: findError } = await supabase
    .from("users")
    .select("id, role, first_name, last_name")
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

  if (body.rut !== undefined && !isValidRut(body.rut)) {
    return apiError("El RUT ingresado no es válido", HTTP_STATUS.BAD_REQUEST, "INVALID_RUT");
  }

  const update: Record<string, unknown> = {};
  if (body.active !== undefined) update.active = body.active;
  if (body.firstName !== undefined) update.first_name = body.firstName.trim();
  if (body.lastName !== undefined) update.last_name = body.lastName.trim();
  if (body.phone !== undefined) update.phone = body.phone.trim() || null;
  if (body.rut !== undefined) update.rut = cleanRut(body.rut);

  if (body.firstName !== undefined || body.lastName !== undefined) {
    const firstName = body.firstName ?? target.first_name ?? "";
    const lastName = body.lastName ?? target.last_name ?? "";
    update.full_name = `${firstName} ${lastName}`.trim();
  }

  if (Object.keys(update).length === 0) {
    return apiError("Nada para actualizar", HTTP_STATUS.BAD_REQUEST, "EMPTY_UPDATE");
  }

  const { data: updated, error: updateError } = await supabase
    .from("users")
    .update(update)
    .eq("id", id)
    .eq("org_id", MVP_ORG_ID)
    .select("id, email, first_name, last_name, full_name, rut, phone, role, active, created_at")
    .single();

  if (updateError) {
    if (updateError.code === "23505") {
      return apiError("Ya existe un usuario con ese RUT", HTTP_STATUS.CONFLICT, "RUT_ALREADY_EXISTS");
    }
    return apiError(updateError.message, HTTP_STATUS.INTERNAL_SERVER_ERROR, "USER_UPDATE_FAILED");
  }

  return NextResponse.json({ user: updated });
});
