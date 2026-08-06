/**
 * Tipos de ingreso y reglas de evaluación bancaria — Plataforma Inmobiliaria Inteligente
 *
 * La banca chilena no evalúa igual todos los ingresos: cada TIPO de ingreso
 * tiene su propio descuento ("haircut"), su propio tope de Leverage, sus
 * propios documentos de respaldo, y en algunos casos gates de exclusión
 * total (ej. sociedad sin liquidez). Un cliente puede declarar VARIOS tipos
 * de ingreso a la vez (ingreso mixto) -- este módulo consolida todas las
 * fuentes en un ingreso efectivo único que alimenta
 * `lib/uf-preevaluation.ts` y `lib/scoring.ts`.
 *
 * 100% determinístico, mismo patrón que el resto del motor financiero.
 */

export type IncomeType = "sueldo_fijo" | "boleta" | "pension" | "alquiler" | "sociedad";

export interface IncomeSource {
  type: IncomeType;
  /** Monto mensual declarado ANTES de aplicar el haircut del tipo (CLP). */
  monthlyAmountCLP: number;

  /** sueldo_fijo: true si el ingreso por bonos supera al sueldo base -- gatilla el descuento de 20%. */
  hasSignificantBonusIncome?: boolean;

  /** boleta: true si el ingreso varía durante el año (vs. un monto fijo mensual) -- gatilla el descuento de 40% en vez de 30%. */
  isVariableBoleta?: boolean;

  /** pension: edad del titular, determina el haircut por tramo etario. */
  ageYears?: number;

  /** alquiler: vigencia declarada del contrato de arriendo, en meses (mínimo exigible: 6). */
  rentalContractMonths?: number;

  /**
   * alquiler: cuántos departamentos tiene el cliente actualmente en arriendo.
   * Dato declarativo para que el ASESOR dimensione el patrimonio en renta;
   * NO participa del cálculo (el haircut de `alquiler` depende solo de la
   * vigencia del contrato), por eso no aparece en `haircutFor`.
   */
  rentedUnitsCount?: number;

  /**
   * sociedad: la empresa debe mostrar liquidez / cierres positivos (SII
   * línea 104/105 con saldo retirado o dividendo pagado). Si es `false`, el
   * ingreso se excluye por completo (se asume quiebre/desfalco, no se
   * considera el ingreso declarado).
   */
  companyHasLiquidity?: boolean;
}

/** Checklist de documentos exigidos por tipo de ingreso (referencia para Bóveda Documental / backoffice). */
export const REQUIRED_DOCUMENTS_BY_INCOME_TYPE: Record<IncomeType, string[]> = {
  sueldo_fijo: [
    "Últimos 3 recibos de sueldo",
    "Cotizaciones de AFP con código de validación",
    "RUT legible (por delante y por detrás)",
    "Vigencia del RUT",
  ],
  boleta: [
    "RUT legible (por delante y por detrás)",
    "Vigencia del RUT",
    "Última declaración de ingreso del SII",
    "Control de boletas emitidas",
  ],
  pension: [
    "RUT legible (por delante y por detrás)",
    "Vigencia del RUT",
    "Certificado de pensión",
    "Últimas 2 declaraciones del SII",
  ],
  alquiler: [
    "RUT legible (por delante y por detrás)",
    "Vigencia del RUT",
    "Contrato de arriendo (mínimo 6 meses)",
    "Últimas 2 declaraciones del SII",
    "Ingresos declarados por alquiler",
  ],
  sociedad: [
    "RUT legible (por delante y por detrás)",
    "Vigencia del RUT",
    "Carpeta tributaria",
    "Últimas 2 declaraciones del SII (línea 104/105 con saldo retirado o dividendo pagado)",
  ],
};

/** Ingreso mensual TOTAL mínimo (ya con haircuts aplicados) para poder optar a una evaluación de compra. */
export const MIN_QUALIFYING_TOTAL_INCOME_CLP = 1_300_000;

/** Duración mínima exigida de un contrato de arriendo para que el ingreso por alquiler cuente. */
const ALQUILER_MIN_CONTRACT_MONTHS = 6;
const ALQUILER_LONG_CONTRACT_MONTHS = 12;

/**
 * Tope de Leverage (múltiplo de ingreso) específico por tipo de ingreso.
 * `sueldo_fijo` usa 8x -- que además ya es el piso estructural del tramo por
 * renta en `lib/uf-preevaluation.ts` (LEVERAGE_TIERS empieza en 8x), así que
 * para un cliente con SOLO sueldo fijo el tramo por renta puede subir el
 * tope hasta 12x sin conflicto. El resto de los tipos de ingreso (boleta,
 * pensión, alquiler, sociedad) tienen un tope DURO de 6x que nunca sube,
 * sin importar el tamaño del ingreso.
 */
const TYPE_LEVERAGE_CAPS: Record<IncomeType, number> = {
  sueldo_fijo: 8,
  boleta: 6,
  pension: 6,
  alquiler: 6,
  sociedad: 6,
};

export interface ExcludedIncomeSource {
  type: IncomeType;
  reason: string;
}

export interface IncomeEvaluation {
  /** Ingreso mensual efectivo total, con haircuts aplicados y fuentes excluidas fuera de la suma. */
  effectiveMonthlyIncomeCLP: number;
  /** Fuentes que no se contaron y por qué (ej. sociedad sin liquidez, arriendo bajo el mínimo de 6 meses). */
  excludedSources: ExcludedIncomeSource[];
  /**
   * Tope de Leverage a aplicar (múltiplo de ingreso) -- el más estricto
   * entre los tipos de ingreso incluidos. `null` si no hay ninguna fuente
   * de ingreso válida (nada que evaluar).
   */
  maxLeverageMultiple: number | null;
  /** `true` si el ingreso efectivo total no alcanza `MIN_QUALIFYING_TOTAL_INCOME_CLP`. */
  disqualifiedByMinimumIncome: boolean;
  /**
   * `true` si hay una fuente de pensión con titular entre 50 y 64 años --
   * no descalifica, pero requiere revisión manual del asesor antes de
   * aprobar (mayor riesgo de rechazo bancario real).
   */
  pensionReviewRequired: boolean;
}

function haircutFor(source: IncomeSource): { multiplier: number; excludedReason: string | null } {
  switch (source.type) {
    case "sueldo_fijo":
      // -20% si el ingreso es mayoritariamente por bonos y no por sueldo base.
      return { multiplier: source.hasSignificantBonusIncome ? 0.8 : 1.0, excludedReason: null };

    case "boleta":
      // -30% si el ingreso por boleta es fijo mes a mes, -40% si varía durante el año.
      return { multiplier: source.isVariableBoleta ? 0.6 : 0.7, excludedReason: null };

    case "pension": {
      const age = source.ageYears ?? 0;
      if (age < 50) return { multiplier: 0.8, excludedReason: null };
      if (age < 65) return { multiplier: 0.6, excludedReason: null };
      return { multiplier: 0.4, excludedReason: null }; // >=65: penalización fuerte, no descalifica
    }

    case "alquiler": {
      const months = source.rentalContractMonths ?? 0;
      if (months < ALQUILER_MIN_CONTRACT_MONTHS) {
        return {
          multiplier: 0,
          excludedReason: `El contrato de arriendo declarado (${months} meses) no alcanza el mínimo exigido de ${ALQUILER_MIN_CONTRACT_MONTHS} meses.`,
        };
      }
      return { multiplier: months >= ALQUILER_LONG_CONTRACT_MONTHS ? 0.7 : 0.6, excludedReason: null };
    }

    case "sociedad":
      if (source.companyHasLiquidity === false) {
        return {
          multiplier: 0,
          excludedReason:
            "La empresa no acredita liquidez ni cierres positivos (SII línea 104/105) -- se asume quiebre/desfalco y no se consideran estos ingresos.",
        };
      }
      return { multiplier: 1.0, excludedReason: null };

    default:
      return { multiplier: 0, excludedReason: "Tipo de ingreso desconocido." };
  }
}

/** Clampa a un número finito >= 0 (mismo patrón defensivo que el resto del motor financiero). */
function safeNonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

/**
 * Consolida una o más fuentes de ingreso declaradas por el cliente (ingreso
 * mixto) en un ingreso efectivo único, aplicando los haircuts y gates de
 * exclusión de cada tipo. El resultado alimenta
 * `calculateUFPreEvaluation` (parámetro `effectiveIncomeCLP` /
 * `maxLeverageMultipleOverride`) y `calculateScoring`.
 */
export function evaluateIncomeSources(sources: IncomeSource[]): IncomeEvaluation {
  let effectiveMonthlyIncomeCLP = 0;
  const excludedSources: ExcludedIncomeSource[] = [];
  const includedLeverageCaps: number[] = [];
  let pensionReviewRequired = false;

  for (const source of sources) {
    const amount = safeNonNegative(source.monthlyAmountCLP);
    const { multiplier, excludedReason } = haircutFor(source);

    if (excludedReason) {
      excludedSources.push({ type: source.type, reason: excludedReason });
      continue;
    }

    effectiveMonthlyIncomeCLP += amount * multiplier;
    includedLeverageCaps.push(TYPE_LEVERAGE_CAPS[source.type]);

    if (source.type === "pension") {
      const age = source.ageYears ?? 0;
      if (age >= 50 && age < 65) pensionReviewRequired = true;
    }
  }

  const maxLeverageMultiple = includedLeverageCaps.length > 0 ? Math.min(...includedLeverageCaps) : null;

  return {
    effectiveMonthlyIncomeCLP,
    excludedSources,
    maxLeverageMultiple,
    disqualifiedByMinimumIncome: effectiveMonthlyIncomeCLP < MIN_QUALIFYING_TOTAL_INCOME_CLP,
    pensionReviewRequired,
  };
}
