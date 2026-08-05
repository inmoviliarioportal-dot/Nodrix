import { describe, it, expect } from "vitest";
import {
  validateLoanTermTiersStructure,
  validateWriteableVariableSet,
  type WizardVariableSetInput,
} from "../../app/api/admin/wizard-variables/_shared";
import { DEFAULT_VARIABLE_SET } from "../../lib/wizard-variables";

/**
 * Tests unitarios de las validaciones de ESCRITURA del agente E3
 * (app/api/admin/wizard-variables/_shared.ts) -- (a) y (b) del punto de
 * verificación del plan.
 */

function baseInput(): WizardVariableSetInput {
  return {
    loanTerms: {
      maxAgeAtApplication: 65,
      fallbackYears: 25,
      tiers: {
        profesional: [
          { maxAge: 44, years: 30 },
          { maxAge: 54, years: 25 },
          { maxAge: 65, years: 15 },
        ],
      },
    },
    qualification: {
      minQualifyingUF: DEFAULT_VARIABLE_SET.qualification.minQualifyingUF,
      minQualifyingTotalIncomeCLP: DEFAULT_VARIABLE_SET.qualification.minQualifyingTotalIncomeCLP,
    },
    bankingParams: {
      minRentaDividendoRatio: 3,
      cargaFinancieraTiers: [
        { maxIncome: 2_000_000, maxRatio: 0.4 },
        { maxIncome: 4_000_000, maxRatio: 0.5 },
        { maxIncome: null, maxRatio: 0.55 },
      ],
      leverageTiers: DEFAULT_VARIABLE_SET.bankingParams.leverageTiers,
      shortTermDebtAmortizationMonths: 12,
    },
    probabilities: DEFAULT_VARIABLE_SET.probabilities,
    assumptions: DEFAULT_VARIABLE_SET.assumptions,
  };
}

describe("validateLoanTermTiersStructure", () => {
  it("(a) rechaza un tramo con un hueco en la secuencia de edades", () => {
    const input = baseInput();
    // En esta representación (cada tramo solo declara su techo de edad) un
    // "hueco/solape" real se manifiesta como un maxAge que NO avanza
    // estrictamente respecto al tramo anterior (duplicado o retrocede).
    input.loanTerms.tiers = {
      profesional: [
        { maxAge: 44, years: 30 },
        { maxAge: 44, years: 25 }, // duplica el mismo maxAge: no avanza -> hueco/solape
        { maxAge: 65, years: 15 },
      ],
    };

    const errors = validateLoanTermTiersStructure(input.loanTerms);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes("profesional"))).toBe(true);
  });

  it("(a-bis) rechaza tramos fuera de orden (maxAge descendente)", () => {
    const input = baseInput();
    input.loanTerms.tiers = {
      profesional: [
        { maxAge: 54, years: 25 },
        { maxAge: 44, years: 30 }, // retrocede
      ],
    };
    const errors = validateLoanTermTiersStructure(input.loanTerms);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("acepta una secuencia estrictamente ascendente válida", () => {
    const input = baseInput();
    const errors = validateLoanTermTiersStructure(input.loanTerms);
    expect(errors).toEqual([]);
  });
});

describe("validateWriteableVariableSet — límites duros en la ruta de escritura", () => {
  it("(b) rechaza cargaFinancieraTiers.maxRatio > 0.6", () => {
    const input = baseInput();
    input.bankingParams.cargaFinancieraTiers = [
      { maxIncome: 2_000_000, maxRatio: 0.4 },
      { maxIncome: null, maxRatio: 0.75 }, // excede 0.6
    ];

    const errors = validateWriteableVariableSet(input);
    expect(errors.some((e) => e.includes("cargaFinancieraTiers") && e.includes("0.6"))).toBe(true);
  });

  it("rechaza minRentaDividendoRatio < 2.5", () => {
    const input = baseInput();
    input.bankingParams.minRentaDividendoRatio = 2;
    const errors = validateWriteableVariableSet(input);
    expect(errors.some((e) => e.includes("minRentaDividendoRatio"))).toBe(true);
  });

  it("rechaza edad + plazo > 80 en loan_terms.tiers", () => {
    const input = baseInput();
    input.loanTerms.tiers = {
      profesional: [{ maxAge: 65, years: 30 }], // 65 + 30 = 95 > 80
    };
    const errors = validateWriteableVariableSet(input);
    expect(errors.some((e) => e.includes("excede 80"))).toBe(true);
  });

  it("rechaza professionalLevelProbabilityCap fuera de [0,100]", () => {
    const input = baseInput();
    input.probabilities = {
      ...DEFAULT_VARIABLE_SET.probabilities,
      professionalLevelProbabilityCap: { profesional: 150, tecnico: 80 },
    };
    const errors = validateWriteableVariableSet(input);
    expect(errors.some((e) => e.includes("professionalLevelProbabilityCap"))).toBe(true);
  });

  it("acepta un input íntegramente válido", () => {
    const input = baseInput();
    const errors = validateWriteableVariableSet(input);
    expect(errors).toEqual([]);
  });
});
