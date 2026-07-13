import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { apiError, requireAuth, withErrorHandling, HTTP_STATUS } from "@/app/api/_shared";
import { APPLICATION_STAGES, isValidStage, type AnySupabaseClient } from "@/lib/leads";

/**
 * PATCH /api/applications/[id]/stage
 *
 * Body: `{ stage: string, note?: string }`.
 *
 * MANUAL stage change for Release 1 — no state-machine validation of legal
 * transitions yet (Release 2 automates that). The only validation performed
 * is that `stage` is one of the exact values in the `applications.stage`
 * CHECK constraint (`database/schema.sql`):
 * RECEPCIONADA, SCORING_COMPLETADO, DOCUMENTOS_PENDIENTES,
 * DOCUMENTOS_APROBADOS, PRE_EVALUACION_COMPLETADA, VISITA_COMPLETADA,
 * ENVIADO_A_BANCO, ESCRITURACION_AGENDADA, CIERRE.
 *
 * Every change is recorded in `application_stage_history` (from_stage,
 * to_stage, actor_user_id = the authenticated user, note).
 * Requires an authenticated session.
 */
export const PATCH = withErrorHandling(async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  const { id } = await context.params;
  if (!id) {
    return apiError("Missing application id", HTTP_STATUS.BAD_REQUEST, "MISSING_ID");
  }

  const body = await request.json().catch(() => null);
  const stage = body && typeof body === "object" ? (body as Record<string, unknown>).stage : undefined;
  const note = body && typeof body === "object" ? (body as Record<string, unknown>).note : undefined;

  if (!isValidStage(stage)) {
    return apiError(
      `Invalid stage. Must be one of: ${APPLICATION_STAGES.join(", ")}`,
      HTTP_STATUS.BAD_REQUEST,
      "INVALID_STAGE"
    );
  }

  const supabase = createSupabaseServiceRoleClient() as unknown as AnySupabaseClient;

  const { data: current, error: currentError } = await supabase
    .from("applications")
    .select("id, stage")
    .eq("id", id)
    .maybeSingle();

  if (currentError) {
    return apiError(`Failed to load application: ${currentError.message}`, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
  if (!current) {
    return apiError("Application not found", HTTP_STATUS.NOT_FOUND, "APPLICATION_NOT_FOUND");
  }

  const currentStage = (current as { stage: string }).stage;

  const { data: updated, error: updateError } = await supabase
    .from("applications")
    .update({ stage })
    .eq("id", id)
    .select("*")
    .single();

  if (updateError || !updated) {
    return apiError(
      `Failed to update stage: ${updateError?.message ?? "unknown error"}`,
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }

  const { error: historyError } = await supabase.from("application_stage_history").insert({
    application_id: id,
    from_stage: currentStage,
    to_stage: stage,
    actor_user_id: auth.user.id,
    note: typeof note === "string" && note.trim() ? note.trim() : null,
  });

  if (historyError) {
    return apiError(
      `Stage updated but failed to record history: ${historyError.message}`,
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }

  return NextResponse.json({ application: updated });
});
