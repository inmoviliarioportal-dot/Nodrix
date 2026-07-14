import { describe, it, expect } from "vitest";
import {
  calculateScoring,
  FACTOR_WEIGHTS,
  SCORING_THRESHOLDS,
  RULES_VERSION,
  type CustomerFinancialProfile,
} from "../../lib/scoring";

function profile(overrides: Partial<CustomerFinancialProfile> = {}): CustomerFinancialProfile {
  return {
    monthlySalary: 1_000_000,
    savingsAmount: 5_000_000,
    employmentType: "indefinido",
    employmentYears: 3,
    hasExistingDebt: false,
    monthlyDebtPayments: 0,
    ...overrides,
  };
}

describe("scoring engine — configuración de pesos y umbrales", () => {
  it("la suma de los pesos de los factores nunca excede 100", () => {
    const total = Object.values(FACTOR_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBeLessThanOrEqual(100);
    expect(total).toBe(100);
  });

  it("los umbrales de categoría cubren el rango 0-100 sin huecos ni solapamientos", () => {
    expect(SCORING_THRESHOLDS.BRONCE.min).toBe(0);
    expect(SCORING_THRESHOLDS.BRONCE.max + 1).toBe(SCORING_THRESHOLDS.PLATA.min);
    expect(SCORING_THRESHOLDS.PLATA.max + 1).toBe(SCORING_THRESHOLDS.ORO.min);
    expect(SCORING_THRESHOLDS.ORO.max + 1).toBe(SCORING_THRESHOLDS.PLATINO.min);
    expect(SCORING_THRESHOLDS.PLATINO.max + 1).toBe(SCORING_THRESHOLDS.BLACK.min);
    expect(SCORING_THRESHOLDS.BLACK.max).toBe(100);
  });
});

describe("scoring engine — determinismo", () => {
  it("el mismo input siempre produce el mismo output", () => {
    const p = profile();
    const r1 = calculateScoring(p);
    const r2 = calculateScoring(p);
    expect(r1).toEqual(r2);
  });

  it("incluye rulesVersion para trazabilidad", () => {
    const result = calculateScoring(profile());
    expect(result.rulesVersion).toBe(RULES_VERSION);
  });

  it("incluye factorsApplied explicando cada factor con sus puntos y peso", () => {
    const result = calculateScoring(profile());
    expect(result.factorsApplied).toHaveLength(4);
    for (const f of result.factorsApplied) {
      expect(f.points).toBeGreaterThanOrEqual(0);
      expect(f.points).toBeLessThanOrEqual(f.weight);
    }
    expect(result.explanation.length).toBeGreaterThan(0);
  });
});

describe("scoring engine — un caso por categoría", () => {
  it("clasifica un perfil de bajo puntaje como BRONCE", () => {
    const result = calculateScoring({
      monthlySalary: 350_000,
      savingsAmount: 500_000,
      employmentType: "independiente",
      employmentYears: 0,
      hasExistingDebt: true,
      monthlyDebtPayments: 300_000,
    });

    expect(result.category).toBe("BRONCE");
    expect(result.score).toBeGreaterThanOrEqual(SCORING_THRESHOLDS.BRONCE.min);
    expect(result.score).toBeLessThanOrEqual(SCORING_THRESHOLDS.BRONCE.max);
  });

  it("clasifica un perfil intermedio-bajo como PLATA", () => {
    const result = calculateScoring({
      monthlySalary: 700_000,
      savingsAmount: 3_000_000,
      employmentType: "honorarios",
      employmentYears: 1,
      hasExistingDebt: true,
      monthlyDebtPayments: 200_000,
    });

    expect(result.category).toBe("PLATA");
    expect(result.score).toBeGreaterThanOrEqual(SCORING_THRESHOLDS.PLATA.min);
    expect(result.score).toBeLessThanOrEqual(SCORING_THRESHOLDS.PLATA.max);
  });

  it("clasifica un perfil sólido como ORO", () => {
    const result = calculateScoring({
      monthlySalary: 1_000_000,
      savingsAmount: 6_000_000,
      employmentType: "plazo_fijo",
      employmentYears: 2,
      hasExistingDebt: true,
      monthlyDebtPayments: 100_000,
    });

    expect(result.category).toBe("ORO");
    expect(result.score).toBeGreaterThanOrEqual(SCORING_THRESHOLDS.ORO.min);
    expect(result.score).toBeLessThanOrEqual(SCORING_THRESHOLDS.ORO.max);
  });

  it("clasifica un perfil muy bueno como PLATINO", () => {
    const result = calculateScoring({
      monthlySalary: 1_800_000,
      savingsAmount: 7_000_000,
      employmentType: "indefinido",
      employmentYears: 4,
      hasExistingDebt: false,
      monthlyDebtPayments: 0,
    });

    expect(result.category).toBe("PLATINO");
    expect(result.score).toBeGreaterThanOrEqual(SCORING_THRESHOLDS.PLATINO.min);
    expect(result.score).toBeLessThanOrEqual(SCORING_THRESHOLDS.PLATINO.max);
  });

  it("clasifica un perfil excepcional como BLACK", () => {
    const result = calculateScoring({
      monthlySalary: 3_000_000,
      savingsAmount: 12_000_000,
      employmentType: "indefinido",
      employmentYears: 6,
      hasExistingDebt: false,
      monthlyDebtPayments: 0,
    });

    expect(result.category).toBe("BLACK");
    expect(result.score).toBeGreaterThanOrEqual(SCORING_THRESHOLDS.BLACK.min);
    expect(result.score).toBeLessThanOrEqual(SCORING_THRESHOLDS.BLACK.max);
  });
});

describe("scoring engine — edge cases", () => {
  it("salario 0 aporta 0 puntos en el factor Salario y no rompe el cálculo", () => {
    const result = calculateScoring(profile({ monthlySalary: 0 }));
    const salarioFactor = result.factorsApplied.find((f) => f.factor === "Salario")!;
    expect(salarioFactor.points).toBe(0);
    expect(Number.isFinite(result.score)).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it("deuda muy alta (ratio > 50% del salario) anula el factor de carga financiera", () => {
    const result = calculateScoring(
      profile({
        monthlySalary: 1_000_000,
        hasExistingDebt: true,
        monthlyDebtPayments: 900_000,
      })
    );
    const cargaFactor = result.factorsApplied.find((f) => f.factor === "Carga financiera")!;
    expect(cargaFactor.points).toBe(0);
  });

  it("deuda existente pero sin salario válido para calcular el ratio da 0 puntos de carga (peor caso)", () => {
    const result = calculateScoring(
      profile({
        monthlySalary: 0,
        hasExistingDebt: true,
        monthlyDebtPayments: 100_000,
      })
    );
    const cargaFactor = result.factorsApplied.find((f) => f.factor === "Carga financiera")!;
    expect(cargaFactor.points).toBe(0);
  });

  it("trabajador independiente sin antigüedad recibe el puntaje mínimo de estabilidad laboral", () => {
    const result = calculateScoring(
      profile({ employmentType: "independiente", employmentYears: 0 })
    );
    const estabilidadFactor = result.factorsApplied.find(
      (f) => f.factor === "Estabilidad laboral"
    )!;
    // typeScore 0.3 * 0.6 + yearsScore 0.1 * 0.4 = 0.22 -> 0.22 * 20 = 4.4
    expect(estabilidadFactor.points).toBeCloseTo(4.4, 5);
  });

  it("sin deuda existente el factor de carga financiera obtiene el puntaje máximo", () => {
    const result = calculateScoring(profile({ hasExistingDebt: false, monthlyDebtPayments: 0 }));
    const cargaFactor = result.factorsApplied.find((f) => f.factor === "Carga financiera")!;
    expect(cargaFactor.points).toBe(FACTOR_WEIGHTS.CARGA_FINANCIERA);
  });

  it("el score nunca excede el rango [0, 100] incluso con inputs extremos", () => {
    const result = calculateScoring(
      profile({
        monthlySalary: 999_999_999,
        savingsAmount: 999_999_999,
        employmentYears: 100,
        hasExistingDebt: false,
      })
    );
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it("valores negativos o inválidos no rompen el cálculo y se tratan como mínimo", () => {
    const result = calculateScoring(
      profile({ monthlySalary: -500, savingsAmount: -1000, employmentYears: -2 })
    );
    expect(Number.isFinite(result.score)).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });
});
