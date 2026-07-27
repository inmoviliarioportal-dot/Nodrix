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

/** Tasa anual referencial de crédito hipotecario en UF. */
export const ANNUAL_INTEREST_RATE = 0.045;

/** Plazo referencial de crédito hipotecario, en años. */
export const LOAN_TERM_YEARS = 25;

/**
 * Deuda de corto plazo se asume amortizada en 12 meses para derivar una
 * cuota mensual estimada a partir del saldo total declarado (mismo supuesto
 * que `lib/scoring.ts` — `SHORT_TERM_DEBT_AMORTIZATION_MONTHS`).
 */
const SHORT_TERM_DEBT_AMORTIZATION_MONTHS = 12;

/**
 * Los 3 parámetros que la banca chilena evalúa para el flujo financiero
 * futuro de un crédito hipotecario (ver "Parámetros financieros.xlsx",
 * pestaña Calculadora, aportada por el negocio):
 *
 * 1. Relación Renta/Dividendo (RRD): ingresos totales / dividendo nuevo debe
 *    ser >= 3 veces -- equivalente a que el dividendo nuevo no supere 1/3 del
 *    ingreso.
 * 2. Carga Financiera: (cuotas totales, incluyendo el dividendo nuevo) /
 *    ingresos totales, con un máximo que sube por tramo de renta.
 * 3. Leverage: deuda de corto plazo total / ingresos totales, con un máximo
 *    (múltiplo) que también sube por tramo de renta.
 */
export const MIN_RENTA_DIVIDENDO_RATIO = 3;

/** Tramos de Carga Financiera máxima según ingreso total mensual (CLP). */
const CARGA_FINANCIERA_TIERS: { maxIncome: number; maxRatio: number }[] = [
  { maxIncome: 2_000_000, maxRatio: 0.4 },
  { maxIncome: 4_000_000, maxRatio: 0.5 },
  { maxIncome: Infinity, maxRatio: 0.55 },
];

/** Tramos de Leverage máximo (múltiplo de ingreso) según ingreso total mensual (CLP). */
const LEVERAGE_TIERS: { maxIncome: number; maxMultiple: number }[] = [
  { maxIncome: 2_000_000, maxMultiple: 8 },
  { maxIncome: Infinity, maxMultiple: 12 },
];

function tierFor<T extends { maxIncome: number }>(tiers: T[], income: number): T {
  return tiers.find((t) => income <= t.maxIncome) ?? tiers[tiers.length - 1];
}

/**
 * Umbral mínimo de UF estimadas para que el cliente "califique" para acceder
 * a un inmueble en la pre-evaluación. Por debajo de este número, el cliente
 * no ve bandas/propuesta -- solo un mensaje de que por ahora no califica
 * (ver components/dashboard/InitialProposalCard.tsx).
 */
export const MIN_QUALIFYING_UF = 1700;

export interface UFPreEvaluationInput {
  monthlySalaryCLP: number;
  /** Saldo TOTAL de deuda de corto plazo vigente (CLP), no la cuota mensual. */
  totalDebtBalanceCLP: number;
  savingsAmountCLP: number; // pie disponible
  approvalProbability: number; // 0-100, viene de calculateProposalBands
  /**
   * Renta líquida mensual del aval/codeudor (CLP), si el cliente declaró uno
   * en el wizard. Opcional -- si no viene, el cálculo es idéntico al de
   * antes (sin aval).
   */
  avalMonthlySalaryCLP?: number;
}

export interface UFPreEvaluationResult {
  maxMonthlyInstallmentCLP: number;
  maxLoanUF: number;
  pieUF: number;
  estimatedPropertyValueUF: number; // maxLoanUF + pieUF
  disclaimer: string;
  /**
   * `true` si el saldo de deuda de corto plazo excede el múltiplo de
   * Leverage permitido para el tramo de ingreso del cliente -- en ese caso
   * `maxMonthlyInstallmentCLP` se fuerza a 0 (no califica) sin importar el
   * resto de los parámetros, porque el Leverage es un gate independiente de
   * la Carga Financiera y la RRD.
   */
  disqualifiedByLeverage: boolean;
}

const DISCLAIMER =
  "Esta es una pre-evaluación aproximada basada en tu perfil financiero, no corresponde a una aprobación bancaria real. El monto final queda sujeto a la evaluación formal del banco tras el envío de tus documentos.";

/** Clampa a un número finito >= 0 (mismo patrón defensivo que lib/proposal-risk.ts). */
function safeNonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function calculateUFPreEvaluation(input: UFPreEvaluationInput): UFPreEvaluationResult {
  const monthlySalaryCLP = safeNonNegative(input.monthlySalaryCLP);
  const totalDebtBalanceCLP = safeNonNegative(input.totalDebtBalanceCLP);
  const savingsAmountCLP = safeNonNegative(input.savingsAmountCLP);
  const approvalProbability = Number.isFinite(input.approvalProbability)
    ? Math.min(100, Math.max(0, input.approvalProbability))
    : 0;

  const avalMonthlySalaryCLP = safeNonNegative(input.avalMonthlySalaryCLP ?? 0);

  // El aval no tiene deuda propia registrada en este MVP (no se le pide un
  // perfil financiero completo, solo renta) -- por eso su renta suma
  // íntegra al ingreso total usado en los 3 parámetros bancarios. Es una
  // simplificación razonable para el MVP: en la práctica un banco evaluaría
  // también la deuda del aval, pero no la recolectamos hoy.
  const effectiveIncomeCLP = monthlySalaryCLP + avalMonthlySalaryCLP;

  // Parámetro 3: Leverage -- deuda de corto plazo total / ingresos. Es un
  // gate de calificación: si se excede, el cliente no califica sin importar
  // los otros dos parámetros.
  const leverageTier = tierFor(LEVERAGE_TIERS, effectiveIncomeCLP);
  const disqualifiedByLeverage =
    effectiveIncomeCLP > 0 && totalDebtBalanceCLP > effectiveIncomeCLP * leverageTier.maxMultiple;

  // Cuota mensual estimada de la deuda existente (saldo total / 12 meses,
  // mismo supuesto de "corto plazo" que lib/scoring.ts).
  const existingMonthlyDebtEstimateCLP = totalDebtBalanceCLP / SHORT_TERM_DEBT_AMORTIZATION_MONTHS;

  // Parámetro 1: RRD (renta/dividendo >= 3) -- el dividendo nuevo no puede
  // superar 1/3 del ingreso total.
  const rrdCapCLP = effectiveIncomeCLP / MIN_RENTA_DIVIDENDO_RATIO;

  // Parámetro 2: Carga Financiera -- (cuotas existentes + dividendo nuevo) /
  // ingreso total no puede superar el máximo del tramo de renta.
  const cargaFinancieraTier = tierFor(CARGA_FINANCIERA_TIERS, effectiveIncomeCLP);
  const cargaFinancieraCapCLP =
    effectiveIncomeCLP * cargaFinancieraTier.maxRatio - existingMonthlyDebtEstimateCLP;

  const maxMonthlyInstallmentCLP = disqualifiedByLeverage
    ? 0
    : safeNonNegative(Math.min(rrdCapCLP, cargaFinancieraCapCLP));

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
    disqualifiedByLeverage,
  };
}
