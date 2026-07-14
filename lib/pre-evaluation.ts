/**
 * Simulador hipotecario mock — fórmulas deterministas compartidas entre
 * `POST /api/applications/[id]/pre-evaluate` (disparo manual) y el motor de
 * transiciones automáticas (`lib/stage-machine.ts`, disparo al llegar a
 * PRE_EVALUACION_COMPLETADA).
 *
 * ⚠️ MOCK / ILUSTRATIVO — no hay integración bancaria real en el MVP.
 */
export const PRE_EVALUATION_MIN_UF = 2500;
export const PRE_EVALUATION_MAX_UF = 8000;

/** Defaults conservadores cuando no se dispone de salary/savings reales
 * (ej. en el disparo automático, donde ese dato aún no vive en `applications`). */
export const DEFAULT_SALARY = 700_000; // CLP
export const DEFAULT_SAVINGS = 3_000_000; // CLP

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export interface PreEvaluationResult {
  minUF: number;
  maxUF: number;
  confidence: number;
}

/**
 * minUF = clamp((salary * 20) / 4000, 2500, 8000)
 * maxUF = clamp((salary * 35) / 4000 + (savings / 50000), 2500, 8000)
 * confidence = min(0.95, 0.70 + (score / 100) * 0.25)
 */
export function calculatePreEvaluation({
  salary,
  savings,
  score,
}: {
  salary: number;
  savings: number;
  score: number;
}): PreEvaluationResult {
  const minUFRaw = (salary * 20) / 4000;
  const maxUFRaw = (salary * 35) / 4000 + savings / 50000;

  const minUF = round2(clamp(minUFRaw, PRE_EVALUATION_MIN_UF, PRE_EVALUATION_MAX_UF));
  const maxUF = round2(clamp(Math.max(maxUFRaw, minUFRaw), PRE_EVALUATION_MIN_UF, PRE_EVALUATION_MAX_UF));
  const confidence = round2(Math.min(0.95, 0.7 + (score / 100) * 0.25));

  return { minUF, maxUF, confidence };
}
