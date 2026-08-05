/**
 * Resolver de Variables del Wizard — Plataforma Inmobiliaria Inteligente
 *
 * Consume `wizard_variable_sets` (database/migrations/031_wizard_variable_sets.sql)
 * y el anclaje `applications.wizard_variable_set_id`
 * (database/migrations/032_application_variable_pin.sql) para que:
 *
 * 1. Una solicitud YA CALCULADA siga viendo SIEMPRE los mismos parámetros
 *    financieros, aunque un admin publique una versión nueva después
 *    (`resolveVariablesForRead`).
 * 2. Una solicitud se "ancle" (o re-ancle) a la versión vigente en el
 *    momento exacto en que se calcula por primera vez, o cuando el cliente
 *    edita su perfil financiero (`pinActiveVariables`).
 *
 * Mismo patrón de fallback seguro que `loadActiveScoringConfig`
 * (lib/scoring.ts): si no hay fila válida, jamás se lanza una excepción que
 * tumbe el flujo del cliente — se cae a un default conocido y se deja un
 * `console.warn` (TODO: reemplazar por un logger real cuando exista).
 *
 * IMPORTANTE — separación lectura/escritura:
 * `resolveVariablesForRead` es de SOLO LECTURA por diseño: no tiene acceso a
 * ningún método de escritura de Supabase (insert/update/upsert), ni siquiera
 * por error. Esto es la barrera que evita que una lectura (ej. renderizar un
 * dashboard) ancle o mueva accidentalmente la versión de una solicitud.
 * Anclar/re-anclar es una acción explícita y deliberada, solo disponible a
 * través de `pinActiveVariables`.
 */

import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

// =============================================================================
// Tipos — derivados 1:1 de los comentarios COMMENT ON COLUMN de la migración
// 031_wizard_variable_sets.sql. No inventar campos que no estén en el seed.
// =============================================================================

/** Plazo del crédito. `tiers` es placeholder vacío hasta que un agente C1
 * posterior defina la matriz edad x nivel profesional. */
export interface LoanTermsConfig {
  maxAgeAtApplication: number;
  fallbackYears: number;
  /** Matriz edad x nivel profesional, aún sin definir (placeholder `{}`). */
  tiers: Record<string, { maxAge?: number; termYears?: number }>;
}

/** Umbrales mínimos de calificación para optar a evaluación de compra. */
export interface QualificationConfig {
  minQualifyingUF: number;
  minQualifyingTotalIncomeCLP: number;
}

export interface IncomeTier {
  /** `null` representa el tramo sin techo (Infinity). */
  maxIncome: number | null;
  maxRatio: number;
}

export interface LeverageTier {
  /** `null` representa el tramo sin techo (Infinity). */
  maxIncome: number | null;
  maxMultiple: number;
}

/** Parámetros de los 3 gates bancarios (RRD / Carga Financiera / Leverage). */
export interface BankingParamsConfig {
  minRentaDividendoRatio: number;
  cargaFinancieraTiers: IncomeTier[];
  leverageTiers: LeverageTier[];
  shortTermDebtAmortizationMonths: number;
}

export interface PensionAgeTier {
  /** `null` representa el tramo sin techo (>=65 años). */
  maxAge: number | null;
  multiplier: number;
}

/** Porcentajes de probabilidad de aprobación bancaria. */
export interface ProbabilitiesConfig {
  /** Fracción 0-1 por banda de propuesta inicial (ej. "1", "1-2", ...). */
  bandDifficulty: Record<string, number>;
  /** Porcentaje 0-100, tope por nivel profesional. */
  professionalLevelProbabilityCap: Record<string, number>;
  pensionAgeTiers: PensionAgeTier[];
}

/** Supuestos financieros generales. NO incluye UF_VALUE_CLP (siempre en vivo). */
export interface AssumptionsConfig {
  annualInterestRate: number;
}

export type WizardVariableSetStatus = "draft" | "active" | "archived" | "default";

/** Set de variables ya parseado a tipos TypeScript (no JSONB crudo). */
export interface VariableSet {
  /** `null` cuando es el default sintético en memoria (no hay fila real en DB). */
  id: string | null;
  version: number;
  status: WizardVariableSetStatus;
  loanTerms: LoanTermsConfig;
  qualification: QualificationConfig;
  bankingParams: BankingParamsConfig;
  probabilities: ProbabilitiesConfig;
  assumptions: AssumptionsConfig;
}

// =============================================================================
// Default "versión 1" — replica EXACTAMENTE el seed de
// 031_wizard_variable_sets.sql (que a su vez replica los hardcodeados de
// lib/uf-preevaluation.ts, lib/income-types.ts y lib/proposal-risk.ts).
// Se usa como respaldo en memoria cuando no hay fila válida en DB.
// =============================================================================

export const DEFAULT_VARIABLE_SET: VariableSet = {
  id: null,
  version: 1,
  status: "default",
  loanTerms: {
    maxAgeAtApplication: 65,
    fallbackYears: 25,
    tiers: {},
  },
  qualification: {
    minQualifyingUF: 1700,
    minQualifyingTotalIncomeCLP: 1_300_000,
  },
  bankingParams: {
    minRentaDividendoRatio: 3,
    cargaFinancieraTiers: [
      { maxIncome: 2_000_000, maxRatio: 0.4 },
      { maxIncome: 4_000_000, maxRatio: 0.5 },
      { maxIncome: null, maxRatio: 0.55 },
    ],
    leverageTiers: [
      { maxIncome: 2_000_000, maxMultiple: 8 },
      { maxIncome: null, maxMultiple: 12 },
    ],
    shortTermDebtAmortizationMonths: 12,
  },
  probabilities: {
    bandDifficulty: {
      "1": 0.95,
      "1-2": 0.83,
      "2-3": 0.71,
      "3-4": 0.59,
      "4-5": 0.47,
      "5-6": 0.35,
    },
    professionalLevelProbabilityCap: {
      profesional: 90,
      tecnico: 80,
    },
    pensionAgeTiers: [
      { maxAge: 50, multiplier: 0.8 },
      { maxAge: 65, multiplier: 0.6 },
      { maxAge: null, multiplier: 0.4 },
    ],
  },
  assumptions: {
    annualInterestRate: 0.045,
  },
};

// =============================================================================
// Límites duros — invariantes de negocio que ninguna fila de
// wizard_variable_sets puede violar, ni editada directo en la base.
// =============================================================================

/**
 * Valida los límites duros de negocio sobre un `VariableSet` ya parseado.
 * Retorna la lista de violaciones (vacía si es válido). Nunca lanza.
 */
export function validateVariableSetHardLimits(set: VariableSet): string[] {
  const violations: string[] = [];

  // 1. loan_terms.tiers: ningún tramo puede producir edad + plazo > 80.
  //    `tiers` está vacío `{}` hoy (placeholder para un agente C1 posterior),
  //    así que este chequeo es un no-op en la práctica hasta que tenga
  //    contenido, pero queda activo y listo para cuando se llene.
  for (const [key, tier] of Object.entries(set.loanTerms.tiers ?? {})) {
    const maxAge = tier?.maxAge;
    const termYears = tier?.termYears;
    if (typeof maxAge === "number" && typeof termYears === "number" && maxAge + termYears > 80) {
      violations.push(
        `loan_terms.tiers["${key}"]: edad + plazo (${maxAge} + ${termYears} = ${maxAge + termYears}) excede 80`
      );
    }
  }

  // 2. banking_params.cargaFinancieraTiers[].maxRatio nunca > 0.6.
  set.bankingParams.cargaFinancieraTiers.forEach((tier, i) => {
    if (tier.maxRatio > 0.6) {
      violations.push(`banking_params.cargaFinancieraTiers[${i}].maxRatio (${tier.maxRatio}) excede 0.6`);
    }
  });

  // 3. banking_params.minRentaDividendoRatio nunca < 2.5.
  if (set.bankingParams.minRentaDividendoRatio < 2.5) {
    violations.push(
      `banking_params.minRentaDividendoRatio (${set.bankingParams.minRentaDividendoRatio}) es menor a 2.5`
    );
  }

  // 4. probabilities.bandDifficulty: fracción 0-1.
  for (const [band, value] of Object.entries(set.probabilities.bandDifficulty)) {
    if (value < 0 || value > 1) {
      violations.push(`probabilities.bandDifficulty["${band}"] (${value}) fuera de rango [0,1]`);
    }
  }

  // 5. probabilities.professionalLevelProbabilityCap: porcentaje 0-100.
  for (const [level, value] of Object.entries(set.probabilities.professionalLevelProbabilityCap)) {
    if (value < 0 || value > 100) {
      violations.push(`probabilities.professionalLevelProbabilityCap["${level}"] (${value}) fuera de rango [0,100]`);
    }
  }

  return violations;
}

/** `true` si el set respeta todos los límites duros de negocio. */
export function isVariableSetValid(set: VariableSet): boolean {
  return validateVariableSetHardLimits(set).length === 0;
}

// =============================================================================
// Parseo de fila cruda de wizard_variable_sets -> VariableSet tipado
// =============================================================================

interface WizardVariableSetRow {
  id: string;
  version: number;
  status: WizardVariableSetStatus;
  loan_terms: LoanTermsConfig;
  qualification: QualificationConfig;
  banking_params: BankingParamsConfig;
  probabilities: ProbabilitiesConfig;
  assumptions: AssumptionsConfig;
}

function parseVariableSetRow(row: WizardVariableSetRow): VariableSet {
  return {
    id: row.id,
    version: row.version,
    status: row.status,
    loanTerms: row.loan_terms,
    qualification: row.qualification,
    bankingParams: row.banking_params,
    probabilities: row.probabilities,
    assumptions: row.assumptions,
  };
}

// =============================================================================
// Cliente de solo lectura — barrera de diseño explícita.
//
// `ReadOnlyQueryClient` solo expone `from().select().eq().maybeSingle()`
// (encadenado). No expone `.insert()/.update()/.upsert()/.delete()` ni a
// nivel de tipos ni a nivel de runtime: `toReadOnlyClient` construye un
// wrapper nuevo que solo reenvía `select`, así que aunque alguien intente
// castear o acceder dinámicamente, el wrapper en sí no tiene esos métodos.
// =============================================================================

interface ReadOnlyEqBuilder<T> {
  eq: (column: string, value: string | number) => ReadOnlyEqBuilder<T> & {
    maybeSingle: () => Promise<{ data: T | null; error: unknown }>;
  };
  maybeSingle: () => Promise<{ data: T | null; error: unknown }>;
}

interface ReadOnlyQueryClient {
  from: (table: string) => {
    select: (columns: string) => ReadOnlyEqBuilder<any>;
  };
}

/**
 * Envuelve un cliente Supabase "completo" (service role) en uno que SOLO
 * reenvía la cadena de lectura (`select`). El objeto resultante no tiene
 * ningún método de escritura definido — no es solo un tipo restringido, es
 * un objeto distinto sin esas propiedades.
 */
function toReadOnlyClient(fullClient: {
  from: (table: string) => { select: (columns: string) => any };
}): ReadOnlyQueryClient {
  return {
    from: (table: string) => ({
      select: (columns: string) => fullClient.from(table).select(columns),
    }),
  };
}

// =============================================================================
// resolveVariablesForRead — SOLO LECTURA, nunca escribe.
// =============================================================================

interface ApplicationPinRow {
  id: string;
  org_id: string;
  wizard_variable_set_id: string | null;
}

/**
 * Resuelve el `VariableSet` aplicable a una solicitud, para USO DE LECTURA
 * (calcular/mostrar resultados). Nunca escribe ni ancla nada.
 *
 * Reglas:
 * - Si `applications.wizard_variable_set_id` es NULL (solicitud histórica) o
 *   la fila referenciada no existe o viola algún límite duro, cae a la
 *   VERSIÓN 1 (nunca a la vigente/`active` más reciente) — no debe alterar
 *   silenciosamente el resultado que ya vio el cliente aplicando parámetros
 *   más nuevos.
 * - Cualquier fallo de infraestructura también cae al default en memoria;
 *   esta función nunca lanza una excepción que tumbe el flujo del cliente.
 */
export async function resolveVariablesForRead(applicationId: string): Promise<VariableSet> {
  // Se construye el cliente completo solo para pasarlo por el wrapper de
  // solo lectura; a partir de acá esta función únicamente tiene en su
  // scope el objeto `readOnly`, que no expone insert/update/upsert.
  const fullClient = createSupabaseServiceRoleClient() as unknown as {
    from: (table: string) => { select: (columns: string) => any };
  };
  const readOnly = toReadOnlyClient(fullClient);

  try {
    const { data: application, error: appError } = await readOnly
      .from("applications")
      .select("id, org_id, wizard_variable_set_id")
      .eq("id", applicationId)
      .maybeSingle() as { data: ApplicationPinRow | null; error: unknown };

    if (appError || !application) {
      console.warn(
        // TODO(F2): conectar a un logger real en vez de console.warn.
        `[wizard-variables] resolveVariablesForRead: no se encontró la solicitud ${applicationId}, usando versión 1 por defecto.`
      );
      return await resolveVersionOneOrDefault(readOnly, undefined);
    }

    if (!application.wizard_variable_set_id) {
      console.warn(
        `[wizard-variables] resolveVariablesForRead: solicitud ${applicationId} sin anclaje (histórica), usando versión 1.`
      );
      return await resolveVersionOneOrDefault(readOnly, application.org_id);
    }

    const { data: row, error: setError } = await readOnly
      .from("wizard_variable_sets")
      .select("id, version, status, loan_terms, qualification, banking_params, probabilities, assumptions")
      .eq("id", application.wizard_variable_set_id)
      .maybeSingle() as { data: WizardVariableSetRow | null; error: unknown };

    if (setError || !row) {
      console.warn(
        `[wizard-variables] resolveVariablesForRead: fila anclada ${application.wizard_variable_set_id} no encontrada para solicitud ${applicationId}, usando versión 1.`
      );
      return await resolveVersionOneOrDefault(readOnly, application.org_id);
    }

    const parsed = parseVariableSetRow(row);
    const violations = validateVariableSetHardLimits(parsed);
    if (violations.length > 0) {
      console.warn(
        `[wizard-variables] resolveVariablesForRead: fila anclada ${row.id} (v${row.version}) viola límites duros [${violations.join("; ")}], usando versión 1.`
      );
      return await resolveVersionOneOrDefault(readOnly, application.org_id);
    }

    return parsed;
  } catch (err) {
    console.warn(
      `[wizard-variables] resolveVariablesForRead: fallo inesperado resolviendo solicitud ${applicationId}, usando default en memoria.`,
      err
    );
    return DEFAULT_VARIABLE_SET;
  }
}

/**
 * Intenta cargar la fila `version = 1` real (para trazabilidad/auditoría);
 * si no existe o es inválida, cae al default en memoria. `orgId` es
 * opcional porque puede no conocerse (ej. la solicitud no existía).
 */
async function resolveVersionOneOrDefault(
  readOnly: ReadOnlyQueryClient,
  orgId: string | undefined
): Promise<VariableSet> {
  if (!orgId) return DEFAULT_VARIABLE_SET;

  try {
    const { data: row, error } = await readOnly
      .from("wizard_variable_sets")
      .select("id, version, status, loan_terms, qualification, banking_params, probabilities, assumptions")
      .eq("org_id", orgId)
      .eq("version", 1)
      .maybeSingle() as { data: WizardVariableSetRow | null; error: unknown };

    if (error || !row) return DEFAULT_VARIABLE_SET;

    const parsed = parseVariableSetRow(row);
    return isVariableSetValid(parsed) ? parsed : DEFAULT_VARIABLE_SET;
  } catch {
    return DEFAULT_VARIABLE_SET;
  }
}

// =============================================================================
// pinActiveVariables — ancla o re-ancla una solicitud. ÚNICA función que
// escribe en este módulo.
// =============================================================================

interface ActiveVariableSetRow extends WizardVariableSetRow {
  org_id: string;
}

/**
 * Ancla (o re-ancla) `applicationId` a la versión ACTIVA vigente de
 * `wizard_variable_sets` para la organización de esa solicitud.
 *
 * Orden de resolución de "cuál es la versión a anclar" (nunca falla duro):
 * 1. Fila con `status = 'active'` para el org_id de la solicitud.
 * 2. Si no hay activa (o viola límites duros): fila `version = 1` de esa
 *    organización (sembrada por la migración 031 — F1).
 * 3. Si tampoco existe ninguna fila real en la tabla (DB vacía / entorno
 *    sin seed corrido): default en memoria (`DEFAULT_VARIABLE_SET`). En
 *    este caso último, como no hay ningún `id` real al que apuntar, NO se
 *    actualiza `applications.wizard_variable_set_id` (la FK no lo permite)
 *    — se deja como estaba y se registra una advertencia; el set default
 *    igual se devuelve para que el cálculo pueda seguir funcionando.
 */
export async function pinActiveVariables(
  applicationId: string,
  reason: "first_calculation" | "profile_update"
): Promise<{ set: VariableSet; previousVersion: number | null }> {
  const supabase = createSupabaseServiceRoleClient() as unknown as {
    from: (table: string) => any;
  };

  const { data: application, error: appError } = await supabase
    .from("applications")
    .select("id, org_id, wizard_variable_set_id")
    .eq("id", applicationId)
    .maybeSingle();

  if (appError || !application) {
    throw new Error(
      `pinActiveVariables: no se encontró la solicitud ${applicationId} (${(appError as Error)?.message ?? "not found"})`
    );
  }

  const orgId: string = application.org_id;
  const previousSetId: string | null = application.wizard_variable_set_id ?? null;

  let previousVersion: number | null = null;
  if (previousSetId) {
    const { data: prevRow } = await supabase
      .from("wizard_variable_sets")
      .select("version")
      .eq("id", previousSetId)
      .maybeSingle();
    previousVersion = prevRow?.version ?? null;
  }

  // 1. Buscar la versión activa vigente.
  const { data: activeRow } = await supabase
    .from("wizard_variable_sets")
    .select("id, org_id, version, status, loan_terms, qualification, banking_params, probabilities, assumptions")
    .eq("org_id", orgId)
    .eq("status", "active")
    .maybeSingle();

  let resolved: VariableSet | null = null;
  if (activeRow) {
    const parsed = parseVariableSetRow(activeRow as ActiveVariableSetRow);
    if (isVariableSetValid(parsed)) {
      resolved = parsed;
    } else {
      console.warn(
        `[wizard-variables] pinActiveVariables: fila activa ${activeRow.id} (v${activeRow.version}) viola límites duros, cayendo a versión 1.`
      );
    }
  } else {
    console.warn(
      `[wizard-variables] pinActiveVariables: no hay fila 'active' para org ${orgId}, cayendo a versión 1.`
    );
  }

  // 2. Fallback: versión 1 real de la organización.
  if (!resolved) {
    const { data: v1Row } = await supabase
      .from("wizard_variable_sets")
      .select("id, org_id, version, status, loan_terms, qualification, banking_params, probabilities, assumptions")
      .eq("org_id", orgId)
      .eq("version", 1)
      .maybeSingle();

    if (v1Row) {
      const parsedV1 = parseVariableSetRow(v1Row as ActiveVariableSetRow);
      resolved = isVariableSetValid(parsedV1) ? parsedV1 : null;
      if (!resolved) {
        console.warn(
          `[wizard-variables] pinActiveVariables: incluso la versión 1 de org ${orgId} viola límites duros, usando default en memoria.`
        );
      }
    }
  }

  // 3. Último fallback: default en memoria (sin fila real -> no hay FK a la
  //    que apuntar, no se actualiza wizard_variable_set_id).
  if (!resolved) {
    if (!activeRow) {
      console.warn(
        `[wizard-variables] pinActiveVariables: no existe ninguna fila real de wizard_variable_sets para org ${orgId}; se usa el default en memoria y NO se actualiza el anclaje (no hay id real para la FK).`
      );
    }
    resolved = DEFAULT_VARIABLE_SET;
  }

  const newVersion = resolved.version;

  if (resolved.id) {
    const { error: updateError } = await supabase
      .from("applications")
      .update({ wizard_variable_set_id: resolved.id })
      .eq("id", applicationId);

    if (updateError) {
      throw new Error(
        `pinActiveVariables: fallo al actualizar wizard_variable_set_id de la solicitud ${applicationId}: ${(updateError as Error).message}`
      );
    }

    await supabase.from("audit_events").insert({
      org_id: orgId,
      entity_type: "application",
      entity_id: applicationId,
      action: "wizard_variables_pinned",
      before: { wizardVariableSetId: previousSetId, version: previousVersion },
      after: { wizardVariableSetId: resolved.id, version: newVersion, reason },
    });
  }

  return { set: resolved, previousVersion };
}
