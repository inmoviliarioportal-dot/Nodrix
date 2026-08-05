/**
 * Fórmulas compartidas de simulación de impacto de plazo del crédito.
 *
 * Extraído de `scripts/loan-term-impact-report.ts` (E-anterior) para poder
 * reutilizarse también desde `app/api/admin/wizard-variables/simulate/route.ts`
 * (Route Handler) sin duplicar la fórmula financiera una tercera vez. Ambos
 * puntos de entrada (script standalone y route handler) importan estas dos
 * funciones desde acá.
 *
 * Usa los mismos supuestos hardcodeados de v1 (annualInterestRate 0.045,
 * UF_VALUE_CLP 39000, plazo plano 25 años) porque estas funciones solo
 * necesitan invertir/recalcular la anualidad para el plazo NUEVO -- el gate
 * de capacidad de pago (RRD/Carga Financiera/Leverage) no cambia con la
 * matriz de plazos, solo el plazo/annuityFactor.
 */

export const SIMULATION_UF_VALUE_CLP = 39000;
export const SIMULATION_ANNUAL_INTEREST_RATE = 0.045;
export const SIMULATION_MIN_QUALIFYING_UF = 1700;
/** Plazo plano usado para calcular el `pre_evaluation_max_uf` ya persistido (v1). */
export const SIMULATION_FALLBACK_YEARS_V1 = 25;

/**
 * Recalcula maxLoanUF dado un `maxMonthlyInstallmentCLP` YA conocido (el
 * gate de capacidad de pago no cambia, solo el plazo/annuityFactor). Si
 * `years` es null (disqualifiedByAge), el monto se fuerza a 0.
 */
export function recalcMaxLoanUF(maxMonthlyInstallmentCLP: number, years: number | null): number {
  if (years === null || !(maxMonthlyInstallmentCLP > 0)) return 0;
  const monthlyRate = SIMULATION_ANNUAL_INTEREST_RATE / 12;
  const numPayments = years * 12;
  const annuityFactor = (1 - Math.pow(1 + monthlyRate, -numPayments)) / monthlyRate;
  return (maxMonthlyInstallmentCLP * annuityFactor) / SIMULATION_UF_VALUE_CLP;
}

/**
 * Deriva `maxMonthlyInstallmentCLP` desde el `pre_evaluation_max_uf` YA
 * persistido, invirtiendo la fórmula de anualidad con el plazo v1 (25 años,
 * el fallback plano usado para calcular ese valor originalmente).
 */
export function impliedMonthlyInstallmentFromMaxUF(maxUF: number): number {
  if (!(maxUF > 0)) return 0;
  const maxLoanCLP = maxUF * SIMULATION_UF_VALUE_CLP;
  const monthlyRate = SIMULATION_ANNUAL_INTEREST_RATE / 12;
  const numPayments = SIMULATION_FALLBACK_YEARS_V1 * 12;
  const annuityFactor = (1 - Math.pow(1 + monthlyRate, -numPayments)) / monthlyRate;
  return maxLoanCLP / annuityFactor;
}

export function ageTierLabel(age: number | null): string {
  if (age === null) return "sin_edad";
  if (age <= 44) return "hasta_44";
  if (age <= 54) return "45_54";
  if (age <= 65) return "55_65";
  return "66_mas";
}
