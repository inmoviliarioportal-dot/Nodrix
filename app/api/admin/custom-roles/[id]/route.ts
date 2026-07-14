import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase";
import { apiError, requireRole, withErrorHandling, HTTP_STATUS } from "@/app/api/_shared";
import { MVP_ORG_ID } from "@/app/api/auth/_constants";
import { PERMISSION_MODULES, normalizePermissionMap } from "@/lib/permissions";

type PatchBody = {
  name?: string;
  permissions?: Record<string, string>;
};

/** PATCH /api/admin/custom-roles/{id} — actualiza nombre y/o permisos. Solo admin. */
export const PATCH = withErrorHandling(async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const auth = await requireRole(["admin"]);
  if (!auth.authorized) return auth.response;

  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as PatchBody | null;
  if (!body) {
    return apiError("Body inválido", HTTP_STATUS.BAD_REQUEST, "INVALID_BODY");
  }

  const update: Record<string, unknown> = {};
  if (body.name?.trim()) update.name = body.name.trim();
  if (body.permissions) {
    const permissions = normalizePermissionMap(body.permissions);
    const hasAnyAccess = PERMISSION_MODULES.some((module) => permissions[module] !== "none");
    if (!hasAnyAccess) {
      return apiError(
        "El rol debe tener al menos un módulo con acceso.",
        HTTP_STATUS.BAD_REQUEST,
        "EMPTY_PERMISSIONS"
      );
    }
    update.permissions = permissions;
  }

  if (Object.keys(update).length === 0) {
    return apiError("Nada para actualizar.", HTTP_STATUS.BAD_REQUEST, "EMPTY_UPDATE");
  }

  const supabase = createSupabaseServiceRoleClient() as any;
  const { data, error } = await supabase
    .from("custom_roles")
    .update(update)
    .eq("id", id)
    .eq("org_id", MVP_ORG_ID)
    .select("*")
    .single();

  if (error || !data) {
    return apiError(
      `No se pudo actualizar el rol: ${error?.message ?? "no encontrado"}`,
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }

  return NextResponse.json({ role: data });
});
