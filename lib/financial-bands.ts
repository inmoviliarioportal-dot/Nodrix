/**
 * Bandas financieras estilo simulador bancario chileno (CLP).
 *
 * En vez de pedir montos exactos por input numérico libre (fricción alta,
 * "tipear números"), el Wizard de perfilamiento (app/onboarding/wizard/page.tsx)
 * pide elegir un RANGO como tarjeta seleccionable. Cada banda tiene un valor
 * `representative` — el número que efectivamente alimenta el motor de scoring
 * determinístico (`lib/scoring.ts`, que espera `monthlySalary`/`savingsAmount`/
 * `monthlyDebtPayments` como números, no bandas) en vez de que el cliente
 * tenga que tipear un monto exacto.
 */

export interface FinancialBand {
  id: string;
  label: string;
  representative: number;
}

/** Renta líquida mensual (CLP). Alimenta `CustomerFinancialProfile.monthlySalary`. */
export const SALARY_BANDS: FinancialBand[] = [
  { id: "b1", label: "Menos de $500.000", representative: 400_000 },
  { id: "b2", label: "$500.000 - $1.000.000", representative: 750_000 },
  { id: "b3", label: "$1.000.000 - $1.500.000", representative: 1_250_000 },
  { id: "b4", label: "$1.500.000 - $2.500.000", representative: 2_000_000 },
  { id: "b5", label: "$2.500.000 - $4.000.000", representative: 3_250_000 },
  { id: "b6", label: "Más de $4.000.000", representative: 4_500_000 },
];

/** Ahorro / pie disponible (CLP). Alimenta `CustomerFinancialProfile.savingsAmount`. */
export const SAVINGS_BANDS: FinancialBand[] = [
  { id: "s1", label: "Sin ahorro", representative: 0 },
  { id: "s2", label: "Menos de $2.000.000", representative: 1_000_000 },
  { id: "s3", label: "$2.000.000 - $5.000.000", representative: 3_500_000 },
  { id: "s4", label: "$5.000.000 - $10.000.000", representative: 7_500_000 },
  { id: "s5", label: "$10.000.000 - $20.000.000", representative: 15_000_000 },
  { id: "s6", label: "Más de $20.000.000", representative: 25_000_000 },
];

/** Pago mensual de deudas vigentes (CLP). Alimenta `CustomerFinancialProfile.monthlyDebtPayments`. */
export const DEBT_BANDS: FinancialBand[] = [
  { id: "d1", label: "Menos de $100.000", representative: 50_000 },
  { id: "d2", label: "$100.000 - $300.000", representative: 200_000 },
  { id: "d3", label: "$300.000 - $600.000", representative: 450_000 },
  { id: "d4", label: "Más de $600.000", representative: 750_000 },
];
