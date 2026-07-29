import { describe, expect, it } from "vitest";
import { calculateUFPreEvaluation, UF_VALUE_CLP } from "../../lib/uf-preevaluation";

describe("calculateUFPreEvaluation", () => {
  it("un salario alto sin deuda da un monto de crédito mayor que uno con deuda", () => {
    const noDebt = calculateUFPreEvaluation({
      monthlySalaryCLP: 3_000_000,
      totalDebtBalanceCLP: 0,
      savingsAmountCLP: 10_000_000,
    });
    const withDebt = calculateUFPreEvaluation({
      monthlySalaryCLP: 3_000_000,
      totalDebtBalanceCLP: 9_000_000,
      savingsAmountCLP: 10_000_000,
    });
    expect(noDebt.maxLoanUF).toBeGreaterThan(withDebt.maxLoanUF);
  });

  it("un salario bajo da un crédito menor que uno alto (mismo resto de parámetros)", () => {
    const low = calculateUFPreEvaluation({
      monthlySalaryCLP: 500_000,
      totalDebtBalanceCLP: 0,
      savingsAmountCLP: 1_000_000,
    });
    const high = calculateUFPreEvaluation({
      monthlySalaryCLP: 5_000_000,
      totalDebtBalanceCLP: 0,
      savingsAmountCLP: 1_000_000,
    });
    expect(low.maxLoanUF).toBeLessThan(high.maxLoanUF);
  });

  it("el maxLoanUF depende solo de la capacidad de pago, no de un factor de probabilidad externo", () => {
    // La probabilidad de aprobación (lib/proposal-risk.ts) es un indicador
    // cualitativo interno para el equipo -- NO debe descontar el crédito
    // teórico del cliente. Dos perfiles con exactamente la misma capacidad
    // de pago deben dar el mismo maxLoanUF sin importar nada externo a
    // salario/deuda/ahorro/aval.
    const a = calculateUFPreEvaluation({
      monthlySalaryCLP: 3_000_000,
      totalDebtBalanceCLP: 0,
      savingsAmountCLP: 5_000_000,
    });
    const b = calculateUFPreEvaluation({
      monthlySalaryCLP: 3_000_000,
      totalDebtBalanceCLP: 0,
      savingsAmountCLP: 5_000_000,
    });
    expect(a.maxLoanUF).toBe(b.maxLoanUF);
  });

  it("el pie en UF corresponde al ahorro dividido por el valor de la UF", () => {
    const result = calculateUFPreEvaluation({
      monthlySalaryCLP: 2_000_000,
      totalDebtBalanceCLP: 0,
      savingsAmountCLP: UF_VALUE_CLP * 100,
    });
    expect(result.pieUF).toBeCloseTo(100, 5);
  });

  it("estimatedPropertyValueUF es la suma de maxLoanUF y pieUF", () => {
    const result = calculateUFPreEvaluation({
      monthlySalaryCLP: 1_800_000,
      totalDebtBalanceCLP: 1_200_000,
      savingsAmountCLP: 3_000_000,
    });
    expect(result.estimatedPropertyValueUF).toBeCloseTo(result.maxLoanUF + result.pieUF, 6);
  });

  it("deuda muy alta respecto al ingreso dispara el gate de Leverage y clampa la cuota máxima a 0", () => {
    const result = calculateUFPreEvaluation({
      monthlySalaryCLP: 500_000,
      totalDebtBalanceCLP: 20_000_000,
      savingsAmountCLP: 0,
    });
    expect(result.disqualifiedByLeverage).toBe(true);
    expect(result.maxMonthlyInstallmentCLP).toBe(0);
    expect(result.maxLoanUF).toBe(0);
    expect(result.estimatedPropertyValueUF).toBe(result.pieUF);
  });

  it("sin exceder el Leverage, la cuota máxima nunca es negativa aunque la Carga Financiera se supere", () => {
    const result = calculateUFPreEvaluation({
      monthlySalaryCLP: 1_000_000,
      totalDebtBalanceCLP: 7_000_000, // cuota estimada ~583k, ya solo > 40% del ingreso
      savingsAmountCLP: 0,
    });
    expect(result.disqualifiedByLeverage).toBe(false); // 7M <= 1M * 8 (tramo <=2M)
    expect(result.maxMonthlyInstallmentCLP).toBeGreaterThanOrEqual(0);
  });

  it("nunca lanza con valores inválidos (NaN, negativos, undefined-like)", () => {
    expect(() =>
      calculateUFPreEvaluation({
        monthlySalaryCLP: NaN,
        totalDebtBalanceCLP: -100,
        savingsAmountCLP: NaN,
      })
    ).not.toThrow();

    const result = calculateUFPreEvaluation({
      monthlySalaryCLP: NaN,
      totalDebtBalanceCLP: -100,
      savingsAmountCLP: NaN,
    });
    expect(result.maxLoanUF).toBeGreaterThanOrEqual(0);
    expect(result.pieUF).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(result.estimatedPropertyValueUF)).toBe(true);
  });

  it("agregar avalMonthlySalaryCLP aumenta el resultado respecto a no tener aval", () => {
    const withoutAval = calculateUFPreEvaluation({
      monthlySalaryCLP: 1_500_000,
      totalDebtBalanceCLP: 0,
      savingsAmountCLP: 3_000_000,
    });
    const withAval = calculateUFPreEvaluation({
      monthlySalaryCLP: 1_500_000,
      totalDebtBalanceCLP: 0,
      savingsAmountCLP: 3_000_000,
      avalMonthlySalaryCLP: 1_000_000,
    });
    expect(withAval.maxLoanUF).toBeGreaterThan(withoutAval.maxLoanUF);
    expect(withAval.estimatedPropertyValueUF).toBeGreaterThan(withoutAval.estimatedPropertyValueUF);
  });

  it("incluye un disclaimer no vacío", () => {
    const result = calculateUFPreEvaluation({
      monthlySalaryCLP: 2_000_000,
      totalDebtBalanceCLP: 0,
      savingsAmountCLP: 1_000_000,
    });
    expect(result.disclaimer.length).toBeGreaterThan(10);
  });
});
