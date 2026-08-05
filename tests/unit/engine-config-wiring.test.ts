import { describe, expect, it } from "vitest";
import { calculateUFPreEvaluation } from "../../lib/uf-preevaluation";
import { calculateProposalBands } from "../../lib/proposal-risk";

describe("calculateUFPreEvaluation — config opcional (F3.5 engine-config-wiring)", () => {
  const input = {
    monthlySalaryCLP: 2_000_000,
    totalDebtBalanceCLP: 3_000_000,
    savingsAmountCLP: 5_000_000,
  };

  it("sin config, el resultado es idéntico a llamar la función sin segundo argumento", () => {
    const withoutSecondArg = calculateUFPreEvaluation(input);
    const withUndefinedConfig = calculateUFPreEvaluation(input, undefined);
    expect(withUndefinedConfig).toEqual(withoutSecondArg);
  });

  it("un config con minQualifyingUF/minQualifyingTotalIncomeCLP más exigente descalifica un caso que antes calificaba", () => {
    const baseline = calculateUFPreEvaluation(input);
    expect(baseline.disqualifiedByMinimumIncome).toBe(false);

    const stricter = calculateUFPreEvaluation(input, {
      qualification: { minQualifyingTotalIncomeCLP: 10_000_000 },
    });
    expect(stricter.disqualifiedByMinimumIncome).toBe(true);
    expect(stricter.maxMonthlyInstallmentCLP).toBe(0);
    expect(stricter.maxLoanUF).toBeLessThan(baseline.maxLoanUF);
  });

  it("un config con annualInterestRate distinto cambia maxLoanUF sin cambiar la cuota máxima permitida", () => {
    const baseline = calculateUFPreEvaluation(input);
    const higherRate = calculateUFPreEvaluation(input, { assumptions: { annualInterestRate: 0.09 } });
    expect(higherRate.maxMonthlyInstallmentCLP).toBe(baseline.maxMonthlyInstallmentCLP);
    expect(higherRate.maxLoanUF).toBeLessThan(baseline.maxLoanUF);
  });
});

describe("calculateProposalBands — config opcional (F3.5 engine-config-wiring)", () => {
  it("sin config, el resultado es idéntico a llamar la función sin tercer argumento", () => {
    const withoutThirdArg = calculateProposalBands(75, "profesional");
    const withUndefinedConfig = calculateProposalBands(75, "profesional", undefined);
    expect(withUndefinedConfig).toEqual(withoutThirdArg);
  });

  it("un professionalLevelProbabilityCap más bajo topa la probabilidad más abajo que el default", () => {
    const baseline = calculateProposalBands(100, "profesional");
    const capped = calculateProposalBands(100, "profesional", {
      professionalLevelProbabilityCap: { profesional: 50 },
    });
    for (let i = 0; i < baseline.length; i++) {
      expect(capped[i].approvalProbability).toBeLessThanOrEqual(50);
      expect(capped[i].approvalProbability).toBeLessThanOrEqual(baseline[i].approvalProbability);
    }
  });
});
