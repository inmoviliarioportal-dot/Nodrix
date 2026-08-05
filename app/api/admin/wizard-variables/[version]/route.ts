import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { apiError, requirePermission, withErrorHandling, HTTP_STATUS } from "@/app/api/_shared";
import { MVP_ORG_ID } from "@/app/api/auth/_constants";
import type { AnySupabaseClient } from "@/lib/leads";
import type { WizardVariableSetRow } from "../_shared";

/**
 * GET /api/admin/wizard-variables/[version]
 *
 * Detalle completo (los 5 grupos JSONB) de una versión puntual de
 * `wizard_variable_sets`, para la organización del MVP. Usado por la
 * pantalla de edición/detalle del admin (agente E4, fuera de este scope).
 *
 * Requiere permiso de módulo "variables" nivel "view" como mínimo.
 */
export const GET = withErrorHandling(
  async (_request: Request, context: { params: Promise<{ version: string }> }) => {
    const auth = await requirePermission("variables", "view");
    if (!auth.authorized) return auth.response;

    const { version: versionParam } = await context.params;
    const version = Number(versionParam);
    if (!Number.isInteger(version) || version <= 0) {
      return apiError("El parámetro version debe ser un entero positivo.", HTTP_STATUS.BAD_REQUEST, "INVALID_VERSION");
    }

    const supabase = createSupabaseServiceRoleClient() as unknown as AnySupabaseClient;

    const { data, error } = await (supabase.from("wizard_variable_sets") as any)
      .select(
        "id, org_id, version, status, note, simulated_at, created_by, created_at, loan_terms, qualification, banking_params, probabilities, assumptions"
      )
      .eq("org_id", MVP_ORG_ID)
      .eq("version", version)
      .maybeSingle();

    if (error) {
      return apiError(error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR, "WIZARD_VARIABLES_FETCH_FAILED");
    }
    if (!data) {
      return apiError(`No existe la versión ${version}.`, HTTP_STATUS.NOT_FOUND, "WIZARD_VARIABLES_NOT_FOUND");
    }

    return NextResponse.json({ variableSet: data as WizardVariableSetRow });
  }
);
