import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { apiError, requireAuth, withErrorHandling, HTTP_STATUS } from "@/app/api/_shared";
import { APPLICATION_STAGES, isValidStage, type ApplicationStage, type AnySupabaseClient } from "@/lib/leads";
import { STAGE_TRANSITIONS, applyAutomaticTransitions } from "@/lib/stage-machine";
import { notifyStageChange } from "@/lib/notifications";

/**
 * PATCH /api/applications/[id]/stage
 *
 * Body: `{ stage: string, note?: string }`.
 *
 * Validates the requested transition against `STAGE_TRANSITIONS` above:
 * - `stage` must be a known value from `APPLICATION_STAGES`.
 * - The transition from the application's current stage to `stage` must be
 *   the single legal "next" step for that stage (no skipping, no going
 *   backwards) — otherwise responds 400 `INVALID_TRANSITION`.
 * - RECEPCIONADA -> SCORING_COMPLETADO additionally requires
 *   `applications.scoring_score` to already be set (the scoring engine must
 *   have run) — otherwise responds 400 `SCORING_NOT_READY`.
 *
 * Every successful change is recorded in `application_stage_history`
 * (from_stage, to_stage, actor_user_id = the authenticated user, note).
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
    .select("id, stage, scoring_score")
    .eq("id", id)
    .maybeSingle();

  if (currentError) {
    return apiError(`Failed to load application: ${currentError.message}`, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
  if (!current) {
    return apiError("Application not found", HTTP_STATUS.NOT_FOUND, "APPLICATION_NOT_FOUND");
  }

  const currentStage = (current as { stage: string }).stage as ApplicationStage;
  const scoringScore = (current as { scoring_score: number | null }).scoring_score;

  const transition = STAGE_TRANSITIONS[currentStage];

  if (!transition || transition.next !== stage) {
    const allowed = transition ? transition.next : null;
    return apiError(
      allowed
        ? `Invalid transition: application is in ${currentStage}, only ${currentStage} -> ${allowed} is allowed.`
        : `Invalid transition: ${currentStage} is a terminal stage, no further transitions are allowed.`,
      HTTP_STATUS.BAD_REQUEST,
      "INVALID_TRANSITION"
    );
  }

  if (currentStage === "RECEPCIONADA" && stage === "SCORING_COMPLETADO" && scoringScore == null) {
    return apiError(
      "Cannot move to SCORING_COMPLETADO: the scoring engine has not produced a scoring_score for this application yet.",
      HTTP_STATUS.BAD_REQUEST,
      "SCORING_NOT_READY"
    );
  }

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

  const { data: historyEntry, error: historyError } = await supabase
    .from("application_stage_history")
    .insert({
      application_id: id,
      from_stage: currentStage,
      to_stage: stage,
      actor_user_id: auth.user.id,
      note: typeof note === "string" && note.trim() ? note.trim() : null,
    })
    .select("*")
    .single();

  if (historyError) {
    return apiError(
      `Stage updated but failed to record history: ${historyError.message}`,
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }

  // Notificación por email al cliente (best-effort, ver lib/notifications.ts).
  await notifyStageChange(supabase, id, stage as ApplicationStage);

  // Encadenar cualquier transición automática alcanzable desde el nuevo
  // estado (ej. DOCUMENTOS_APROBADOS -> PRE_EVALUACION_COMPLETADA) — ver
  // lib/stage-machine.ts. Best-effort: si falla, la transición manual ya
  // aplicada sigue siendo válida.
  const { finalStage } = await applyAutomaticTransitions(supabase, id, stage);

  const { data: finalApplication } = await supabase.from("applications").select("*").eq("id", id).maybeSingle();

  const { data: stageHistory } = await supabase
    .from("application_stage_history")
    .select("*")
    .eq("application_id", id)
    .order("created_at", { ascending: false });

  return NextResponse.json({
    application: finalApplication ?? { ...updated, stage: finalStage },
    stageHistory: stageHistory ?? [historyEntry],
  });
});
