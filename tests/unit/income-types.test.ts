import { describe, expect, it } from "vitest";
import { evaluateIncomeSources, MIN_QUALIFYING_TOTAL_INCOME_CLP, type IncomeSource } from "../../lib/income-types";

describe("evaluateIncomeSources", () => {
  it("sueldo fijo sin bono no tiene descuento", () => {
    const result = evaluateIncomeSources([{ type: "sueldo_fijo", monthlyAmountCLP: 2_000_000 }]);
    expect(result.effectiveMonthlyIncomeCLP).toBe(2_000_000);
    expect(result.maxLeverageMultiple).toBe(8);
    expect(result.excludedSources).toHaveLength(0);
  });

  it("sueldo fijo con ingreso mayoritariamente por bonos descuenta 20%", () => {
    const result = evaluateIncomeSources([
      { type: "sueldo_fijo", monthlyAmountCLP: 2_000_000, hasSignificantBonusIncome: true },
    ]);
    expect(result.effectiveMonthlyIncomeCLP).toBeCloseTo(1_600_000, 5);
  });

  it("boleta fija descuenta 30%, boleta variable descuenta 40%", () => {
    const fixed = evaluateIncomeSources([{ type: "boleta", monthlyAmountCLP: 1_000_000 }]);
    const variable = evaluateIncomeSources([
      { type: "boleta", monthlyAmountCLP: 1_000_000, isVariableBoleta: true },
    ]);
    expect(fixed.effectiveMonthlyIncomeCLP).toBeCloseTo(700_000, 5);
    expect(variable.effectiveMonthlyIncomeCLP).toBeCloseTo(600_000, 5);
    expect(fixed.maxLeverageMultiple).toBe(6);
  });

  it("pensión: <50 años 80%, 50-64 60% + revisión, >=65 40% sin descalificar", () => {
    const young = evaluateIncomeSources([{ type: "pension", monthlyAmountCLP: 1_000_000, ageYears: 40 }]);
    const mid = evaluateIncomeSources([{ type: "pension", monthlyAmountCLP: 1_000_000, ageYears: 60 }]);
    const old = evaluateIncomeSources([{ type: "pension", monthlyAmountCLP: 1_000_000, ageYears: 70 }]);

    expect(young.effectiveMonthlyIncomeCLP).toBeCloseTo(800_000, 5);
    expect(young.pensionReviewRequired).toBe(false);

    expect(mid.effectiveMonthlyIncomeCLP).toBeCloseTo(600_000, 5);
    expect(mid.pensionReviewRequired).toBe(true);

    expect(old.effectiveMonthlyIncomeCLP).toBeCloseTo(400_000, 5);
    expect(old.excludedSources).toHaveLength(0); // no descalifica, solo penaliza fuerte
  });

  it("alquiler con contrato >= 12 meses descuenta 30%, entre 6-11 meses descuenta 40%", () => {
    const long = evaluateIncomeSources([
      { type: "alquiler", monthlyAmountCLP: 500_000, rentalContractMonths: 12 },
    ]);
    const short = evaluateIncomeSources([
      { type: "alquiler", monthlyAmountCLP: 500_000, rentalContractMonths: 6 },
    ]);
    expect(long.effectiveMonthlyIncomeCLP).toBeCloseTo(350_000, 5);
    expect(short.effectiveMonthlyIncomeCLP).toBeCloseTo(300_000, 5);
  });

  it("alquiler con contrato menor a 6 meses se excluye por completo", () => {
    const result = evaluateIncomeSources([
      { type: "alquiler", monthlyAmountCLP: 500_000, rentalContractMonths: 3 },
    ]);
    expect(result.effectiveMonthlyIncomeCLP).toBe(0);
    expect(result.excludedSources).toHaveLength(1);
    expect(result.excludedSources[0].type).toBe("alquiler");
  });

  it("sociedad sin liquidez se excluye por completo, con liquidez cuenta 100%", () => {
    const illiquid = evaluateIncomeSources([
      { type: "sociedad", monthlyAmountCLP: 1_000_000, companyHasLiquidity: false },
    ]);
    const liquid = evaluateIncomeSources([
      { type: "sociedad", monthlyAmountCLP: 1_000_000, companyHasLiquidity: true },
    ]);
    expect(illiquid.effectiveMonthlyIncomeCLP).toBe(0);
    expect(illiquid.excludedSources).toHaveLength(1);
    expect(liquid.effectiveMonthlyIncomeCLP).toBe(1_000_000);
  });

  it("ingreso mixto suma las fuentes válidas y usa el Leverage más estricto entre los tipos incluidos", () => {
    const sources: IncomeSource[] = [
      { type: "sueldo_fijo", monthlyAmountCLP: 1_000_000 },
      { type: "alquiler", monthlyAmountCLP: 500_000, rentalContractMonths: 12 },
    ];
    const result = evaluateIncomeSources(sources);
    expect(result.effectiveMonthlyIncomeCLP).toBeCloseTo(1_000_000 + 350_000, 5);
    expect(result.maxLeverageMultiple).toBe(6); // min(8, 6)
  });

  it("marca disqualifiedByMinimumIncome si el ingreso efectivo total no alcanza el mínimo", () => {
    const belowMin = evaluateIncomeSources([{ type: "sueldo_fijo", monthlyAmountCLP: 1_000_000 }]);
    const atMin = evaluateIncomeSources([
      { type: "sueldo_fijo", monthlyAmountCLP: MIN_QUALIFYING_TOTAL_INCOME_CLP },
    ]);
    expect(belowMin.disqualifiedByMinimumIncome).toBe(true);
    expect(atMin.disqualifiedByMinimumIncome).toBe(false);
  });

  it("sin ninguna fuente válida, maxLeverageMultiple es null y el ingreso es 0", () => {
    const result = evaluateIncomeSources([
      { type: "sociedad", monthlyAmountCLP: 5_000_000, companyHasLiquidity: false },
    ]);
    expect(result.maxLeverageMultiple).toBeNull();
    expect(result.effectiveMonthlyIncomeCLP).toBe(0);
    expect(result.disqualifiedByMinimumIncome).toBe(true);
  });
});
