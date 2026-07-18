/**
 * Motor de pre-evaluación en UF — Plataforma Inmobiliaria Inteligente
 *
 * Estima cuántas UF de crédito hipotecario podría aprobar un banco, usando
 * la fórmula estándar de anualidad que usan los simuladores hipotecarios
 * chilenos. 100% determinístico (nada de IA generativa), igual que el resto
 * del motor de scoring/riesgo del proyecto.
 *
 * IMPORTANTE: esto es una PRE-EVALUACIÓN aproximada, no una aprobación
 * bancaria real -- ver `disclaimer` en el resultado.
 */

/**
 * Valor aproximado de la UF en pesos chilenos. Placeholder documentado para
 * el MVP -- en producción real esto debería venir de una API de valor UF
 * actualizado (ej. mindicador.cl), no de una constante fija en código.
 */
export const UF_VALUE_CLP = 39000;

/**
 * Proporción máxima del ingreso mensual que un banco chileno típico permite
 * destinar al dividendo hipotecario, considerando además la deuda existente
 * (criterio de "carga financiera" / DTI usado en la banca local).
 */
export const MAX_DEBT_TO_INCOME_RATIO = 0.35;

/** Tasa anual referencial de crédito hipotecario en UF. */
export const ANNUAL_INTEREST_RATE = 0.045;

/** Plazo referencial de crédito hipotecario, en años. */
export const LOAN_TERM_YEARS = 25;

export interface UFPreEvaluationInput {
  monthlySalaryCLP: number;
  monthlyDebtPaymentsCLP: number;
  savingsAmountCLP: number; // pie disponible
  approvalProbability: number; // 0-100, viene de calculateProposalBands
}

export interface UFPreEvaluationResult {
  maxMonthlyInstallmentCLP: number;
  maxLoanUF: number;
  pieUF: number;
  estimatedPropertyValueUF: number; // maxLoanUF + pieUF
  disclaimer: string;
}

const DISCLAIMER =
  "Esta es una pre-evaluación aproximada basada en tu perfil financiero, no corresponde a una aprobación bancaria real. El monto final queda sujeto a la evaluación formal del banco tras el envío de tus documentos.";

/** Clampa a un número finito >= 0 (mismo patrón defensivo que lib/proposal-risk.ts). */
function safeNonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function calculateUFPreEvaluation(input: UFPreEvaluationInput): UFPreEvaluationResult {
  const monthlySalaryCLP = safeNonNegative(input.monthlySalaryCLP);
  const monthlyDebtPaymentsCLP = safeNonNegative(input.monthlyDebtPaymentsCLP);
  const savingsAmountCLP = safeNonNegative(input.savingsAmountCLP);
  const approvalProbability = Number.isFinite(input.approvalProbability)
    ? Math.min(100, Math.max(0, input.approvalProbability))
    : 0;

  const maxMonthlyInstallmentCLP = safeNonNegative(
    monthlySalaryCLP * MAX_DEBT_TO_INCOME_RATIO - monthlyDebtPaymentsCLP
  );

  const monthlyRate = ANNUAL_INTEREST_RATE / 12;
  const numPayments = LOAN_TERM_YEARS * 12;
  const annuityFactor = (1 - Math.pow(1 + monthlyRate, -numPayments)) / monthlyRate;
  const maxLoanCLP = maxMonthlyInstallmentCLP * annuityFactor;
  const maxLoanUFTheoretical = maxLoanCLP / UF_VALUE_CLP;

  // Haircut conservador: el máximo teórico se pondera por la probabilidad
  // real de aprobación de la banda más probable, para no mostrarle al
  // cliente un número optimista que no refleja su riesgo real.
  const maxLoanUF = safeNonNegative(maxLoanUFTheoretical * (approvalProbability / 100));

  const pieUF = safeNonNegative(savingsAmountCLP / UF_VALUE_CLP);

  return {
    maxMonthlyInstallmentCLP,
    maxLoanUF,
    pieUF,
    estimatedPropertyValueUF: maxLoanUF + pieUF,
    disclaimer: DISCLAIMER,
  };
}
