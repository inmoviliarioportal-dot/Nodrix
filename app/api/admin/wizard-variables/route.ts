import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { apiError, requirePermission, withErrorHandling, HTTP_STATUS } from "@/app/api/_shared";
import { MVP_ORG_ID } from "@/app/api/auth/_constants";
import type { AnySupabaseClient } from "@/lib/leads";

/**
 * GET /api/admin/wizard-variables
 *
 * Lista el historial de versiones de `wizard_variable_sets` para la
 * organización del MVP, SOLO con metadata (version, status, note,
 * created_by, created_at, simulated_at) -- nunca el contenido JSONB
 * completo, para no sobrecargar un listado que puede tener muchas
 * versiones a lo largo del tiempo. El detalle completo de una versión vive
 * en GET /api/admin/wizard-variables/[version].
 *
 * Requiere permiso de módulo "variables" nivel "view" como mínimo (admin,
 * gerencia, o un rol personalizado con ese permiso).
 */
export const GET = withErrorHandling(async () => {
  const auth = await requirePermission("variables", "view");
  if (!auth.authorized) return auth.response;

  const supabase = createSupabaseServiceRoleClient() as unknown as AnySupabaseClient;

  const { data, error } = await (supabase.from("wizard_variable_sets") as any)
    .select("version, status, note, simulated_at, created_at, created_by, creator:users ( id, name, email )")
    .eq("org_id", MVP_ORG_ID)
    .order("version", { ascending: false });

  if (error) {
    return apiError(error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR, "WIZARD_VARIABLES_LIST_FAILED");
  }

  return NextResponse.json({ versions: data ?? [] });
});
