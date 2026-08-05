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

import { MIN_QUALIFYING_TOTAL_INCOME_CLP } from "./income-types";
import { loanTermYearsFor, type LoanTermTier } from "./loan-term";
import type { ProfessionalLevel } from "./proposal-risk";

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
 * Configuración opcional para `calculateUFPreEvaluation`, estructuralmente
 * compatible con los grupos `qualification` / `bankingParams` / `assumptions`
 * de `VariableSet` (lib/wizard-variables.ts). Si se omite (o se omite un
 * campo individual), se usa la constante hardcodeada de siempre -- ninguna
 * llamada existente sin `config` cambia de comportamiento.
 *
 * `loanTerms.fallbackYears` reemplaza `LOAN_TERM_YEARS` como fallback plano
 * cuando falta `tiers` o faltan los datos del cliente (`birthDate` /
 * `professionalLevel`) en el input. `loanTerms.tiers`, si viene poblado Y el
 * input trae `birthDate` + `professionalLevel`, se usa junto con
 * `loanTermYearsFor` (lib/loan-term.ts) para determinar el plazo real por
 * edad x nivel profesional -- ver `disqualifiedByAge` en el resultado.
 */
export interface UFPreEvaluationConfig {
  qualification?: {
    minQualifyingUF?: number;
    minQualifyingTotalIncomeCLP?: number;
  };
  bankingParams?: {
    minRentaDividendoRatio?: number;
    cargaFinancieraTiers?: { maxIncome: number | null; maxRatio: number }[];
    leverageTiers?: { maxIncome: number | null; maxMultiple: number }[];
    shortTermDebtAmortizationMonths?: number;
  };
  assumptions?: {
    annualInterestRate?: number;
  };
  loanTerms?: {
    fallbackYears?: number;
    tiers?: Partial<Record<ProfessionalLevel, LoanTermTier[]>>;
  };
}

/** Normaliza `maxIncome: null` (sin techo) a `Infinity` para reusar `tierFor`. */
function normalizeIncomeTiers<T extends { maxIncome: number | null }>(
  tiers: T[]
): (Omit<T, "maxIncome"> & { maxIncome: number })[] {
  return tiers.map((t) => ({ ...t, maxIncome: t.maxIncome ?? Infinity }));
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
  /**
   * Renta líquida mensual del aval/codeudor (CLP), si el cliente declaró uno
   * en el wizard. Opcional -- si no viene, el cálculo es idéntico al de
   * antes (sin aval).
   */
  avalMonthlySalaryCLP?: number;
  /**
   * Tope de Leverage (múltiplo de ingreso) a aplicar en vez del tramo por
   * renta -- viene de `evaluateIncomeSources` (lib/income-types.ts) cuando
   * el ingreso del cliente NO es 100% sueldo fijo (boleta/pensión/alquiler/
   * sociedad tienen un tope duro de 6x que nunca sube, a diferencia del
   * tramo general que puede llegar a 12x). Si se omite, se usa el tramo por
   * renta tal cual (comportamiento idéntico al anterior, sueldo fijo puro).
   */
  maxLeverageMultipleOverride?: number;
  /**
   * Fecha de nacimiento del cliente (ISO), y nivel profesional declarado --
   * datos de ESTA llamada específica (no política congelada), usados junto
   * a `config.loanTerms.tiers` para determinar el plazo real por edad x
   * nivel profesional (ver lib/loan-term.ts). Si se omiten, o `tiers` no
   * está poblado en el config, el cálculo usa el fallback plano de siempre
   * -- comportamiento idéntico al anterior.
   */
  birthDate?: string | null;
  professionalLevel?: ProfessionalLevel | null;
  /** Fecha de nacimiento del aval/codeudor, si lo hay (mejora el plazo si es más joven). */
  avalBirthDate?: string | null;
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
  /**
   * `true` si el ingreso efectivo total (post-haircuts, ver
   * `lib/income-types.ts`) no alcanza `MIN_QUALIFYING_TOTAL_INCOME_CLP` --
   * gate independiente de todo lo demás: sin este mínimo no se evalúa
   * ninguna compra.
   */
  disqualifiedByMinimumIncome: boolean;
  /**
   * `true` si la edad efectiva (cliente, o aval si es más joven) supera
   * `MAX_AGE_AT_APPLICATION` (65) y por lo tanto no hay plazo automático --
   * gate independiente de los otros dos: `maxMonthlyInstallmentCLP` se
   * fuerza a 0 (mismo patrón). Solo puede ser `true` cuando
   * `config.loanTerms.tiers` está poblado Y el input trae `birthDate` +
   * `professionalLevel`; en cualquier otro caso queda en `false` (fallback
   * plano, comportamiento idéntico al anterior).
   */
  disqualifiedByAge: boolean;
}

const DISCLAIMER =
  "Esta es una pre-evaluación aproximada basada en tu perfil financiero, no corresponde a una aprobación bancaria real. El monto final queda sujeto a la evaluación formal del banco tras el envío de tus documentos.";

/** Clampa a un número finito >= 0 (mismo patrón defensivo que lib/proposal-risk.ts). */
function safeNonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function calculateUFPreEvaluation(
  input: UFPreEvaluationInput,
  config?: UFPreEvaluationConfig
): UFPreEvaluationResult {
  const minQualifyingTotalIncomeCLP =
    config?.qualification?.minQualifyingTotalIncomeCLP ?? MIN_QUALIFYING_TOTAL_INCOME_CLP;
  const minRentaDividendoRatio = config?.bankingParams?.minRentaDividendoRatio ?? MIN_RENTA_DIVIDENDO_RATIO;
  const cargaFinancieraTiers = config?.bankingParams?.cargaFinancieraTiers
    ? normalizeIncomeTiers(config.bankingParams.cargaFinancieraTiers)
    : CARGA_FINANCIERA_TIERS;
  const leverageTiers = config?.bankingParams?.leverageTiers
    ? normalizeIncomeTiers(config.bankingParams.leverageTiers)
    : LEVERAGE_TIERS;
  const shortTermDebtAmortizationMonths =
    config?.bankingParams?.shortTermDebtAmortizationMonths ?? SHORT_TERM_DEBT_AMORTIZATION_MONTHS;
  const annualInterestRate = config?.assumptions?.annualInterestRate ?? ANNUAL_INTEREST_RATE;
  const fallbackYears =
    typeof config?.loanTerms?.fallbackYears === "number" ? config.loanTerms.fallbackYears : LOAN_TERM_YEARS;

  // Plazo por edad x nivel profesional: solo se activa si hay tiers
  // poblados en el config Y el input trae birthDate + professionalLevel.
  // En cualquier otro caso se mantiene el fallback plano de siempre (no
  // cambia el resultado de ninguna llamada existente).
  const tiersPopulated = !!config?.loanTerms?.tiers && Object.keys(config.loanTerms.tiers).length > 0;
  const hasClientAgeData = !!input.birthDate && !!input.professionalLevel;

  let loanTermYears = fallbackYears;
  let disqualifiedByAge = false;
  if (tiersPopulated && hasClientAgeData) {
    const termResult = loanTermYearsFor({
      birthDate: input.birthDate,
      professionalLevel: input.professionalLevel ?? null,
      avalBirthDate: input.avalBirthDate,
      tiers: config!.loanTerms!.tiers as Record<ProfessionalLevel, LoanTermTier[]>,
      fallbackYears,
    });
    if (termResult.years === null) {
      disqualifiedByAge = true;
      loanTermYears = fallbackYears; // valor irrelevante, cuota se fuerza a 0 igual
    } else {
      loanTermYears = termResult.years;
    }
  }

  const monthlySalaryCLP = safeNonNegative(input.monthlySalaryCLP);
  const totalDebtBalanceCLP = safeNonNegative(input.totalDebtBalanceCLP);
  const savingsAmountCLP = safeNonNegative(input.savingsAmountCLP);

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
  const leverageTier = tierFor(leverageTiers, effectiveIncomeCLP);
  // El override (tipos de ingreso distintos a sueldo fijo puro) nunca puede
  // SUBIR el tope del tramo por renta, solo bajarlo (más estricto).
  const effectiveMaxLeverageMultiple =
    typeof input.maxLeverageMultipleOverride === "number"
      ? Math.min(leverageTier.maxMultiple, input.maxLeverageMultipleOverride)
      : leverageTier.maxMultiple;
  const disqualifiedByLeverage =
    effectiveIncomeCLP > 0 && totalDebtBalanceCLP > effectiveIncomeCLP * effectiveMaxLeverageMultiple;

  const disqualifiedByMinimumIncome = effectiveIncomeCLP < minQualifyingTotalIncomeCLP;

  // Cuota mensual estimada de la deuda existente (saldo total / 12 meses,
  // mismo supuesto de "corto plazo" que lib/scoring.ts).
  const existingMonthlyDebtEstimateCLP = totalDebtBalanceCLP / shortTermDebtAmortizationMonths;

  // Parámetro 1: RRD (renta/dividendo >= 3) -- el dividendo nuevo no puede
  // superar 1/3 del ingreso total.
  const rrdCapCLP = effectiveIncomeCLP / minRentaDividendoRatio;

  // Parámetro 2: Carga Financiera -- (cuotas existentes + dividendo nuevo) /
  // ingreso total no puede superar el máximo del tramo de renta.
  const cargaFinancieraTier = tierFor(cargaFinancieraTiers, effectiveIncomeCLP);
  const cargaFinancieraCapCLP =
    effectiveIncomeCLP * cargaFinancieraTier.maxRatio - existingMonthlyDebtEstimateCLP;

  const maxMonthlyInstallmentCLP =
    disqualifiedByLeverage || disqualifiedByMinimumIncome || disqualifiedByAge
      ? 0
      : safeNonNegative(Math.min(rrdCapCLP, cargaFinancieraCapCLP));

  const monthlyRate = annualInterestRate / 12;
  const numPayments = loanTermYears * 12;
  const annuityFactor = (1 - Math.pow(1 + monthlyRate, -numPayments)) / monthlyRate;
  const maxLoanCLP = maxMonthlyInstallmentCLP * annuityFactor;

  // La probabilidad de aprobación (banda de riesgo + tope por nivel
  // profesional, ver lib/proposal-risk.ts) es un indicador CUALITATIVO
  // interno para el equipo (asesor/gerencia/admin) sobre qué tan probable es
  // que el banco apruebe -- NO descuenta el crédito teórico que se le
  // muestra/usa para calificar al cliente. El monto que ve el cliente es
  // 100% su capacidad de pago real (RRD/Carga Financiera/Leverage), sin
  // ningún haircut adicional.
  const maxLoanUF = safeNonNegative(maxLoanCLP / UF_VALUE_CLP);

  const pieUF = safeNonNegative(savingsAmountCLP / UF_VALUE_CLP);

  return {
    maxMonthlyInstallmentCLP,
    maxLoanUF,
    pieUF,
    estimatedPropertyValueUF: maxLoanUF + pieUF,
    disclaimer: DISCLAIMER,
    disqualifiedByLeverage,
    disqualifiedByMinimumIncome,
    disqualifiedByAge,
  };
}
