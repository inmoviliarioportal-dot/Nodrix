import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { apiError, requirePermission, withErrorHandling, HTTP_STATUS } from "@/app/api/_shared";
import { MVP_ORG_ID } from "@/app/api/auth/_constants";
import type { AnySupabaseClient } from "@/lib/leads";
import { validateInputShape, validateWriteableVariableSet, type WizardVariableSetInput } from "../_shared";

/**
 * POST /api/admin/wizard-variables/draft
 *
 * Crea o actualiza el borrador (`status = 'draft'`) de `wizard_variable_sets`
 * para la organización del MVP:
 *   - Si ya existe una fila `draft` sin publicar, la actualiza (upsert por
 *     contenido, misma versión).
 *   - Si no existe, crea una fila nueva con `version = MAX(version) + 1`.
 *
 * Aplica, ANTES de escribir, la validación estructural de tramos de
 * `loan_terms.tiers` (sin huecos ni solapes, `maxAge` estrictamente
 * ascendente) y TODOS los límites duros de negocio de
 * `lib/wizard-variables.ts::validateVariableSetHardLimits` -- este endpoint
 * es la ruta de ESCRITURA, así que no puede confiar en que esos límites se
 * apliquen recién al leer; si algo los viola, rechaza con 400 y el detalle
 * de cada violación.
 *
 * Requiere permiso de módulo "variables" nivel "edit" (admin, gerencia u
 * otro rol con ese permiso configurado -- gerencia SÍ puede llegar hasta
 * acá; el límite de que solo admin puede PUBLICAR se aplica únicamente en
 * POST /api/admin/wizard-variables/[version]/publish).
 */
export const POST = withErrorHandling(async (request: Request) => {
  const auth = await requirePermission("variables", "edit");
  if (!auth.authorized) return auth.response;

  const body = await request.json().catch(() => null);
  const shapeErrors = validateInputShape(body);
  if (shapeErrors.length > 0) {
    return apiError(shapeErrors.join(" "), HTTP_STATUS.BAD_REQUEST, "INVALID_BODY");
  }
  const input = body as WizardVariableSetInput;

  const validationErrors = validateWriteableVariableSet(input);
  if (validationErrors.length > 0) {
    return apiError(validationErrors.join(" "), HTTP_STATUS.BAD_REQUEST, "HARD_LIMIT_VIOLATION");
  }

  const supabase = createSupabaseServiceRoleClient() as unknown as AnySupabaseClient;

  const { data: existingDraft, error: draftLookupError } = await (supabase.from("wizard_variable_sets") as any)
    .select("id, version")
    .eq("org_id", MVP_ORG_ID)
    .eq("status", "draft")
    .maybeSingle();

  if (draftLookupError) {
    return apiError(draftLookupError.message, HTTP_STATUS.INTERNAL_SERVER_ERROR, "WIZARD_VARIABLES_DRAFT_LOOKUP_FAILED");
  }

  const payload = {
    loan_terms: input.loanTerms,
    qualification: input.qualification,
    banking_params: input.bankingParams,
    probabilities: input.probabilities,
    assumptions: input.assumptions,
    // Editar el contenido de un borrador invalida cualquier simulación
    // previa -- si no se resetea `simulated_at`, el endpoint de publicar
    // (que exige simulated_at no nulo) podría dejar pasar una versión
    // editada después de simularse por última vez.
    simulated_at: null,
  };

  if (existingDraft) {
    const { data: updated, error: updateError } = await (supabase.from("wizard_variable_sets") as any)
      .update(payload)
      .eq("id", existingDraft.id)
      .select(
        "id, org_id, version, status, note, simulated_at, created_by, created_at, loan_terms, qualification, banking_params, probabilities, assumptions"
      )
      .single();

    if (updateError || !updated) {
      return apiError(
        updateError?.message ?? "No se pudo actualizar el borrador.",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        "WIZARD_VARIABLES_DRAFT_UPDATE_FAILED"
      );
    }

    return NextResponse.json({ variableSet: updated });
  }

  const { data: latest, error: latestError } = await (supabase.from("wizard_variable_sets") as any)
    .select("version")
    .eq("org_id", MVP_ORG_ID)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) {
    return apiError(latestError.message, HTTP_STATUS.INTERNAL_SERVER_ERROR, "WIZARD_VARIABLES_VERSION_LOOKUP_FAILED");
  }

  const nextVersion = (latest?.version ?? 0) + 1;

  const { data: created, error: insertError } = await (supabase.from("wizard_variable_sets") as any)
    .insert({
      org_id: MVP_ORG_ID,
      version: nextVersion,
      status: "draft",
      created_by: auth.user.id,
      ...payload,
    })
    .select(
      "id, org_id, version, status, note, simulated_at, created_by, created_at, loan_terms, qualification, banking_params, probabilities, assumptions"
    )
    .single();

  if (insertError || !created) {
    return apiError(
      insertError?.message ?? "No se pudo crear el borrador.",
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "WIZARD_VARIABLES_DRAFT_CREATE_FAILED"
    );
  }

  return NextResponse.json({ variableSet: created }, { status: 201 });
});
