import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase";
import { apiError, requireRole, withErrorHandling, HTTP_STATUS } from "@/app/api/_shared";
import { MVP_ORG_ID } from "@/app/api/auth/_constants";
import { PERMISSION_MODULES, normalizePermissionMap } from "@/lib/permissions";

/**
 * GET /api/admin/custom-roles — lista roles personalizados de la org.
 * POST /api/admin/custom-roles — crea uno nuevo (matriz de permisos por
 * módulo). Solo `admin` puede crear/gestionar roles -- gerencia puede
 * crear usuarios pero no definir roles nuevos.
 */
export const GET = withErrorHandling(async () => {
  const auth = await requireRole(["admin", "gerencia"]);
  if (!auth.authorized) return auth.response;

  const supabase = createSupabaseServiceRoleClient() as any;
  const { data, error } = await supabase
    .from("custom_roles")
    .select("*")
    .eq("org_id", MVP_ORG_ID)
    .order("created_at", { ascending: false });

  if (error) {
    return apiError(error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR, "ROLES_FETCH_FAILED");
  }

  return NextResponse.json({ roles: data ?? [] });
});

type CreateBody = {
  name?: string;
  permissions?: Record<string, string>;
};

export const POST = withErrorHandling(async (request: Request) => {
  const auth = await requireRole(["admin"]);
  if (!auth.authorized) return auth.response;

  const body = (await request.json().catch(() => null)) as CreateBody | null;
  if (!body?.name?.trim()) {
    return apiError("El rol necesita un nombre.", HTTP_STATUS.BAD_REQUEST, "MISSING_NAME");
  }

  const permissions = normalizePermissionMap(body.permissions);
  const hasAnyAccess = PERMISSION_MODULES.some((module) => permissions[module] !== "none");
  if (!hasAnyAccess) {
    return apiError(
      "El rol debe tener al menos un módulo con acceso.",
      HTTP_STATUS.BAD_REQUEST,
      "EMPTY_PERMISSIONS"
    );
  }

  const supabase = createSupabaseServiceRoleClient() as any;
  const { data, error } = await supabase
    .from("custom_roles")
    .insert({ org_id: MVP_ORG_ID, name: body.name.trim(), permissions })
    .select("*")
    .single();

  if (error) {
    return apiError(error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR, "ROLE_CREATE_FAILED");
  }

  return NextResponse.json({ role: data }, { status: 201 });
});
