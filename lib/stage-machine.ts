import type { AnySupabaseClient, ApplicationStage } from "@/lib/leads";
import { calculatePreEvaluation, DEFAULT_SALARY, DEFAULT_SAVINGS } from "@/lib/pre-evaluation";
import { notifyStageChange } from "@/lib/notifications";

/**
 * Máquina de estados lineal de 9 pasos (mismo orden que el CHECK constraint
 * de `applications.stage` en `database/schema.sql`).
 *
 * `automatic: true` marca las transiciones que el sistema aplica solo, sin
 * intervención del asesor, apenas se cumple la condición de la etapa
 * anterior — ver `applyAutomaticTransitions`. Esto es "IA" en el sentido de
 * automatización basada en reglas deterministas (coherente con el motor de
 * scoring del proyecto, que explícitamente evita IA generativa para
 * decisiones), no un modelo que decide por su cuenta.
 */
export const STAGE_TRANSITIONS: Record<ApplicationStage, { next: ApplicationStage; automatic: boolean } | null> = {
  RECEPCIONADA: { next: "SCORING_COMPLETADO", automatic: false },
  SCORING_COMPLETADO: { next: "DOCUMENTOS_PENDIENTES", automatic: true },
  DOCUMENTOS_PENDIENTES: { next: "DOCUMENTOS_APROBADOS", automatic: false },
  DOCUMENTOS_APROBADOS: { next: "PRE_EVALUACION_COMPLETADA", automatic: true },
  PRE_EVALUACION_COMPLETADA: { next: "VISITA_COMPLETADA", automatic: false },
  VISITA_COMPLETADA: { next: "ENVIADO_A_BANCO", automatic: false },
  ENVIADO_A_BANCO: { next: "ESCRITURACION_AGENDADA", automatic: true },
  ESCRITURACION_AGENDADA: { next: "CIERRE", automatic: false },
  CIERRE: null,
};

/**
 * Aplica en cadena todas las transiciones automáticas alcanzables desde
 * `fromStage` (ej. SCORING_COMPLETADO -> DOCUMENTOS_PENDIENTES, o
 * DOCUMENTOS_APROBADOS -> PRE_EVALUACION_COMPLETADA + cálculo de
 * pre-evaluación). Se detiene en la primera transición manual o terminal.
 *
 * Best-effort: un error de escritura detiene la cadena silenciosamente en
 * vez de lanzar — el avance automático es una mejora de UX, nunca debe
 * bloquear la operación principal que lo disparó (crear lead, cambiar
 * estado manualmente, etc.).
 */
export async function applyAutomaticTransitions(
  supabase: AnySupabaseClient,
  applicationId: string,
  fromStage: ApplicationStage
): Promise<{ finalStage: ApplicationStage; appliedStages: ApplicationStage[] }> {
  let current = fromStage;
  const appliedStages: ApplicationStage[] = [];

  for (let i = 0; i < STAGE_TRANSITIONS_LENGTH_GUARD; i++) {
    const transition = STAGE_TRANSITIONS[current];
    if (!transition || !transition.automatic) break;

    const next = transition.next;

    const { error: updateError } = await supabase
      .from("applications")
      .update({ stage: next })
      .eq("id", applicationId);
    if (updateError) break;

    await supabase.from("application_stage_history").insert({
      application_id: applicationId,
      from_stage: current,
      to_stage: next,
      actor_user_id: null,
      note: "Avance automático: condición de la etapa anterior cumplida.",
    });

    if (next === "PRE_EVALUACION_COMPLETADA") {
      await runAutomaticPreEvaluation(supabase, applicationId);
    }

    // Notificación por email al cliente (best-effort, ver lib/notifications.ts).
    // Se espera (no fire-and-forget) porque en entornos serverless el
    // proceso puede terminar apenas se envía la respuesta HTTP.
    await notifyStageChange(supabase, applicationId, next);

    appliedStages.push(next);
    current = next;
  }

  return { finalStage: current, appliedStages };
}

// Tope de seguridad (más que suficiente para 9 etapas) para nunca quedar en
// un loop infinito si STAGE_TRANSITIONS tuviera un ciclo por error humano.
const STAGE_TRANSITIONS_LENGTH_GUARD = 9;

async function runAutomaticPreEvaluation(supabase: AnySupabaseClient, applicationId: string) {
  const { data: application } = await supabase
    .from("applications")
    .select("scoring_score, pre_evaluation_min_uf, pre_evaluation_max_uf")
    .eq("id", applicationId)
    .maybeSingle();

  // No pisar un cálculo ya existente (ej. si el asesor ya lo corrió manual
  // con datos reales de salary/savings vía POST .../pre-evaluate).
  const row = application as { scoring_score: number | null; pre_evaluation_min_uf: number | null } | null;
  if (row?.pre_evaluation_min_uf != null) return;

  const score = row?.scoring_score ?? 0;
  const { minUF, maxUF } = calculatePreEvaluation({ salary: DEFAULT_SALARY, savings: DEFAULT_SAVINGS, score });

  await supabase
    .from("applications")
    .update({ pre_evaluation_min_uf: minUF, pre_evaluation_max_uf: maxUF })
    .eq("id", applicationId);
}
