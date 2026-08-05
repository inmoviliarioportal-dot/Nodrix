import {
  DEFAULT_VARIABLE_SET,
  validateVariableSetHardLimits,
  type AssumptionsConfig,
  type BankingParamsConfig,
  type LoanTermsConfig,
  type ProbabilitiesConfig,
  type QualificationConfig,
  type VariableSet,
  type WizardVariableSetStatus,
} from "@/lib/wizard-variables";
import type { ProfessionalLevel } from "@/lib/proposal-risk";

/**
 * Cuerpo aceptado por POST /api/admin/wizard-variables/draft. Los 5 grupos
 * son obligatorios (no hay merge parcial con la versión anterior -- el
 * cliente admin siempre manda el objeto completo, igual que el resto de los
 * formularios de configuración de este proyecto).
 */
export interface WizardVariableSetInput {
  loanTerms: LoanTermsConfig;
  qualification: QualificationConfig;
  bankingParams: BankingParamsConfig;
  probabilities: ProbabilitiesConfig;
  assumptions: AssumptionsConfig;
}

export interface WizardVariableSetRow {
  id: string;
  org_id: string;
  version: number;
  status: WizardVariableSetStatus;
  note: string | null;
  simulated_at: string | null;
  created_by: string | null;
  created_at: string;
  loan_terms: LoanTermsConfig;
  qualification: QualificationConfig;
  banking_params: BankingParamsConfig;
  probabilities: ProbabilitiesConfig;
  assumptions: AssumptionsConfig;
}

export function rowToVariableSet(row: WizardVariableSetRow): VariableSet {
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

/**
 * Valida que el body tenga la forma mínima esperada (todos los grupos
 * presentes con sus campos requeridos). No es una validación exhaustiva de
 * tipos -- solo lo suficiente para no dejar pasar `undefined`/`null` a los
 * chequeos de negocio de abajo, que asumen la forma correcta.
 */
export function validateInputShape(body: unknown): string[] {
  const errors: string[] = [];
  if (!body || typeof body !== "object") {
    return ["El cuerpo de la solicitud debe ser un objeto con los 5 grupos de variables."];
  }
  const input = body as Partial<WizardVariableSetInput>;

  if (!input.loanTerms || typeof input.loanTerms !== "object") {
    errors.push("loanTerms es requerido.");
  } else {
    if (typeof input.loanTerms.maxAgeAtApplication !== "number") {
      errors.push("loanTerms.maxAgeAtApplication debe ser numérico.");
    }
    if (typeof input.loanTerms.fallbackYears !== "number") {
      errors.push("loanTerms.fallbackYears debe ser numérico.");
    }
    if (!input.loanTerms.tiers || typeof input.loanTerms.tiers !== "object") {
      errors.push("loanTerms.tiers debe ser un objeto (puede estar vacío).");
    }
  }

  if (!input.qualification || typeof input.qualification !== "object") {
    errors.push("qualification es requerido.");
  } else {
    if (typeof input.qualification.minQualifyingUF !== "number") {
      errors.push("qualification.minQualifyingUF debe ser numérico.");
    }
    if (typeof input.qualification.minQualifyingTotalIncomeCLP !== "number") {
      errors.push("qualification.minQualifyingTotalIncomeCLP debe ser numérico.");
    }
  }

  if (!input.bankingParams || typeof input.bankingParams !== "object") {
    errors.push("bankingParams es requerido.");
  } else {
    if (typeof input.bankingParams.minRentaDividendoRatio !== "number") {
      errors.push("bankingParams.minRentaDividendoRatio debe ser numérico.");
    }
    if (!Array.isArray(input.bankingParams.cargaFinancieraTiers)) {
      errors.push("bankingParams.cargaFinancieraTiers debe ser un arreglo.");
    }
    if (!Array.isArray(input.bankingParams.leverageTiers)) {
      errors.push("bankingParams.leverageTiers debe ser un arreglo.");
    }
    if (typeof input.bankingParams.shortTermDebtAmortizationMonths !== "number") {
      errors.push("bankingParams.shortTermDebtAmortizationMonths debe ser numérico.");
    }
  }

  if (!input.probabilities || typeof input.probabilities !== "object") {
    errors.push("probabilities es requerido.");
  } else {
    if (!input.probabilities.bandDifficulty || typeof input.probabilities.bandDifficulty !== "object") {
      errors.push("probabilities.bandDifficulty debe ser un objeto.");
    }
    if (
      !input.probabilities.professionalLevelProbabilityCap ||
      typeof input.probabilities.professionalLevelProbabilityCap !== "object"
    ) {
      errors.push("probabilities.professionalLevelProbabilityCap debe ser un objeto.");
    }
    if (!Array.isArray(input.probabilities.pensionAgeTiers)) {
      errors.push("probabilities.pensionAgeTiers debe ser un arreglo.");
    }
  }

  if (!input.assumptions || typeof input.assumptions !== "object") {
    errors.push("assumptions es requerido.");
  } else if (typeof input.assumptions.annualInterestRate !== "number") {
    errors.push("assumptions.annualInterestRate debe ser numérico.");
  }

  return errors;
}

/**
 * Validación estructural de `loan_terms.tiers`: por nivel profesional, los
 * tramos deben venir ordenados por `maxAge` estrictamente ascendente (sin
 * huecos ni solapes -- como cada tramo solo declara su techo de edad, el
 * piso implícito es el techo del tramo anterior + 1, así que exigir orden
 * estrictamente ascendente basta para garantizar cobertura contigua sin
 * solape).
 */
export function validateLoanTermTiersStructure(loanTerms: LoanTermsConfig): string[] {
  const errors: string[] = [];
  const tiers = loanTerms?.tiers ?? {};

  for (const [level, levelTiers] of Object.entries(tiers) as [ProfessionalLevel, LoanTermsConfig["tiers"][ProfessionalLevel]][]) {
    if (!Array.isArray(levelTiers) || levelTiers.length === 0) {
      errors.push(`loanTerms.tiers["${level}"] debe ser un arreglo no vacío de tramos.`);
      continue;
    }

    let previousMaxAge = -Infinity;
    for (let i = 0; i < levelTiers.length; i++) {
      const tier = levelTiers[i];
      if (typeof tier?.maxAge !== "number" || typeof tier?.years !== "number") {
        errors.push(`loanTerms.tiers["${level}"][${i}] debe tener maxAge y years numéricos.`);
        continue;
      }
      if (tier.maxAge <= previousMaxAge) {
        errors.push(
          `loanTerms.tiers["${level}"][${i}]: maxAge (${tier.maxAge}) debe ser estrictamente mayor al tramo anterior (${previousMaxAge}) -- los tramos no pueden tener huecos ni solaparse.`
        );
      }
      previousMaxAge = tier.maxAge;
    }
  }

  return errors;
}

/**
 * Corre TODAS las validaciones de escritura (forma + estructura de tramos +
 * límites duros de negocio) sobre un input ya con forma mínima válida.
 * Retorna la lista de errores (vacía si todo pasa). Reusa
 * `validateVariableSetHardLimits` de lib/wizard-variables.ts -- la MISMA
 * función que protege la ruta de lectura -- para no duplicar la lógica de
 * límites duros ni arriesgar que diverjan.
 */
export function validateWriteableVariableSet(input: WizardVariableSetInput): string[] {
  const structuralErrors = validateLoanTermTiersStructure(input.loanTerms);

  const asVariableSet: VariableSet = {
    id: null,
    version: DEFAULT_VARIABLE_SET.version,
    status: "draft",
    loanTerms: input.loanTerms,
    qualification: input.qualification,
    bankingParams: input.bankingParams,
    probabilities: input.probabilities,
    assumptions: input.assumptions,
  };
  const hardLimitErrors = validateVariableSetHardLimits(asVariableSet);

  return [...structuralErrors, ...hardLimitErrors];
}
