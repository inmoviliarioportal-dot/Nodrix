/**
 * Motor de plazo del crédito hipotecario — Plataforma Inmobiliaria Inteligente
 *
 * Determina el plazo (30/25/15 años) según la edad efectiva del cliente al
 * momento de solicitar y su nivel profesional declarado. "Edad efectiva" es
 * la MENOR entre la edad del cliente y la del aval/codeudor (si lo hay) --
 * práctica bancaria real: un aval más joven mejora el plazo del titular.
 *
 * Si la edad efectiva supera `MAX_AGE_AT_APPLICATION` (65), no hay plazo
 * automático -- `years: null`, deriva a revisión manual del asesor. Nunca
 * lanza una excepción por esto (mismo patrón defensivo que el resto del
 * motor de scoring/riesgo del proyecto).
 *
 * Si falta `birthDate` o `professionalLevel` del cliente, se usa el
 * fallback plano (`fallbackYears`, hoy 25) -- comportamiento actual, no
 * bloquea el cálculo por falta de un dato opcional.
 */

import type { ProfessionalLevel } from "./proposal-risk";

/** Edad máxima al momento de solicitar para que aplique un plazo automático. */
export const MAX_AGE_AT_APPLICATION = 65;

export interface LoanTermTier {
  maxAge: number;
  years: 30 | 25 | 15;
}

/**
 * Matriz de negocio: plazo según edad efectiva y nivel profesional.
 * Profesional: hasta 44 -> 30 años, 45-54 -> 25 años, 55-65 -> 15 años.
 * Técnico: hasta 54 -> 25 años, 55-65 -> 15 años.
 * 66+ (ambos): sin tramo, `years: null` (revisión del asesor).
 */
export const DEFAULT_LOAN_TERM_TIERS: Record<ProfessionalLevel, LoanTermTier[]> = {
  profesional: [
    { maxAge: 44, years: 30 },
    { maxAge: 54, years: 25 },
    { maxAge: 65, years: 15 },
  ],
  tecnico: [
    { maxAge: 54, years: 25 },
    { maxAge: 65, years: 15 },
  ],
};

export interface LoanTermResult {
  /** `null` = fuera de tramo (edad efectiva > 65), deriva a revisión del asesor. */
  years: number | null;
  /** `null` si no había `birthDate` disponible para calcular la edad. */
  effectiveAge: number | null;
  /** `true` si la edad del aval fue la que determinó `effectiveAge` (más joven que el cliente). */
  usedAval: boolean;
  reason: string;
}

/**
 * Calcula la edad exacta (considerando si ya pasó el cumpleaños este año)
 * a partir de una fecha ISO de nacimiento, contra la fecha actual.
 * Devuelve `null` si `birthDate` es inválida o vacía.
 */
function calculateAge(birthDate: string | null | undefined, now: Date): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;

  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  const dayDiff = now.getDate() - birth.getDate();
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

export function loanTermYearsFor(input: {
  birthDate: string | null | undefined;
  professionalLevel: ProfessionalLevel | null | undefined;
  avalBirthDate?: string | null;
  /** Matriz resuelta del VariableSet (admin); si no se pasa, usa DEFAULT_LOAN_TERM_TIERS. */
  tiers?: Record<ProfessionalLevel, LoanTermTier[]>;
  /** Plazo a usar si falta `birthDate` o `professionalLevel`. */
  fallbackYears?: number;
}): LoanTermResult {
  const fallbackYears = typeof input.fallbackYears === "number" ? input.fallbackYears : 25;
  const now = new Date();

  const clientAge = calculateAge(input.birthDate, now);
  const professionalLevel = input.professionalLevel ?? null;

  if (clientAge === null || professionalLevel === null) {
    return {
      years: fallbackYears,
      effectiveAge: clientAge,
      usedAval: false,
      reason: "sin_fecha_nacimiento_o_nivel_profesional_fallback",
    };
  }

  const avalAge = calculateAge(input.avalBirthDate, now);
  const usedAval = avalAge !== null && avalAge < clientAge;
  const effectiveAge = usedAval ? (avalAge as number) : clientAge;

  const tiers = input.tiers ?? DEFAULT_LOAN_TERM_TIERS;
  const levelTiers = tiers[professionalLevel] ?? DEFAULT_LOAN_TERM_TIERS[professionalLevel];

  const tier = levelTiers.find((t) => effectiveAge <= t.maxAge);
  if (!tier) {
    return {
      years: null,
      effectiveAge,
      usedAval,
      reason: `fuera_de_tramo_${MAX_AGE_AT_APPLICATION}+`,
    };
  }

  return {
    years: tier.years,
    effectiveAge,
    usedAval,
    reason: `${professionalLevel}_${tier.years}`,
  };
}
