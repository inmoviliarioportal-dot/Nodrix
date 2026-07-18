import { describe, expect, it } from "vitest";
import { calculateUFPreEvaluation, UF_VALUE_CLP } from "../../lib/uf-preevaluation";

describe("calculateUFPreEvaluation", () => {
  it("un salario alto sin deuda da un monto de crédito mayor que uno con deuda", () => {
    const noDebt = calculateUFPreEvaluation({
      monthlySalaryCLP: 3_000_000,
      monthlyDebtPaymentsCLP: 0,
      savingsAmountCLP: 10_000_000,
      approvalProbability: 80,
    });
    const withDebt = calculateUFPreEvaluation({
      monthlySalaryCLP: 3_000_000,
      monthlyDebtPaymentsCLP: 500_000,
      savingsAmountCLP: 10_000_000,
      approvalProbability: 80,
    });
    expect(noDebt.maxLoanUF).toBeGreaterThan(withDebt.maxLoanUF);
  });

  it("un salario bajo da un crédito menor que uno alto (mismo resto de parámetros)", () => {
    const low = calculateUFPreEvaluation({
      monthlySalaryCLP: 500_000,
      monthlyDebtPaymentsCLP: 0,
      savingsAmountCLP: 1_000_000,
      approvalProbability: 80,
    });
    const high = calculateUFPreEvaluation({
      monthlySalaryCLP: 5_000_000,
      monthlyDebtPaymentsCLP: 0,
      savingsAmountCLP: 1_000_000,
      approvalProbability: 80,
    });
    expect(low.maxLoanUF).toBeLessThan(high.maxLoanUF);
  });

  it("una probabilidad de aprobación baja reduce el maxLoanUF respecto a una alta", () => {
    const lowProb = calculateUFPreEvaluation({
      monthlySalaryCLP: 3_000_000,
      monthlyDebtPaymentsCLP: 0,
      savingsAmountCLP: 5_000_000,
      approvalProbability: 20,
    });
    const highProb = calculateUFPreEvaluation({
      monthlySalaryCLP: 3_000_000,
      monthlyDebtPaymentsCLP: 0,
      savingsAmountCLP: 5_000_000,
      approvalProbability: 90,
    });
    expect(lowProb.maxLoanUF).toBeLessThan(highProb.maxLoanUF);
  });

  it("el pie en UF corresponde al ahorro dividido por el valor de la UF", () => {
    const result = calculateUFPreEvaluation({
      monthlySalaryCLP: 2_000_000,
      monthlyDebtPaymentsCLP: 0,
      savingsAmountCLP: UF_VALUE_CLP * 100,
      approvalProbability: 100,
    });
    expect(result.pieUF).toBeCloseTo(100, 5);
  });

  it("estimatedPropertyValueUF es la suma de maxLoanUF y pieUF", () => {
    const result = calculateUFPreEvaluation({
      monthlySalaryCLP: 1_800_000,
      monthlyDebtPaymentsCLP: 100_000,
      savingsAmountCLP: 3_000_000,
      approvalProbability: 60,
    });
    expect(result.estimatedPropertyValueUF).toBeCloseTo(result.maxLoanUF + result.pieUF, 6);
  });

  it("deuda mayor al ingreso disponible clampa la cuota máxima a 0, no negativa", () => {
    const result = calculateUFPreEvaluation({
      monthlySalaryCLP: 500_000,
      monthlyDebtPaymentsCLP: 1_000_000,
      savingsAmountCLP: 0,
      approvalProbability: 50,
    });
    expect(result.maxMonthlyInstallmentCLP).toBe(0);
    expect(result.maxLoanUF).toBe(0);
    expect(result.estimatedPropertyValueUF).toBe(result.pieUF);
  });

  it("nunca lanza con valores inválidos (NaN, negativos, undefined-like)", () => {
    expect(() =>
      calculateUFPreEvaluation({
        monthlySalaryCLP: NaN,
        monthlyDebtPaymentsCLP: -100,
        savingsAmountCLP: NaN,
        approvalProbability: -50,
      })
    ).not.toThrow();

    const result = calculateUFPreEvaluation({
      monthlySalaryCLP: NaN,
      monthlyDebtPaymentsCLP: -100,
      savingsAmountCLP: NaN,
      approvalProbability: 1000,
    });
    expect(result.maxLoanUF).toBeGreaterThanOrEqual(0);
    expect(result.pieUF).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(result.estimatedPropertyValueUF)).toBe(true);
  });

  it("agregar avalMonthlySalaryCLP aumenta el resultado respecto a no tener aval", () => {
    const withoutAval = calculateUFPreEvaluation({
      monthlySalaryCLP: 1_500_000,
      monthlyDebtPaymentsCLP: 0,
      savingsAmountCLP: 3_000_000,
      approvalProbability: 70,
    });
    const withAval = calculateUFPreEvaluation({
      monthlySalaryCLP: 1_500_000,
      monthlyDebtPaymentsCLP: 0,
      savingsAmountCLP: 3_000_000,
      approvalProbability: 70,
      avalMonthlySalaryCLP: 1_000_000,
    });
    expect(withAval.maxLoanUF).toBeGreaterThan(withoutAval.maxLoanUF);
    expect(withAval.estimatedPropertyValueUF).toBeGreaterThan(withoutAval.estimatedPropertyValueUF);
  });

  it("incluye un disclaimer no vacío", () => {
    const result = calculateUFPreEvaluation({
      monthlySalaryCLP: 2_000_000,
      monthlyDebtPaymentsCLP: 0,
      savingsAmountCLP: 1_000_000,
      approvalProbability: 70,
    });
    expect(result.disclaimer.length).toBeGreaterThan(10);
  });
});
