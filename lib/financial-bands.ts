/**
 * Bandas financieras estilo simulador bancario chileno (CLP).
 *
 * En vez de pedir montos exactos por input numérico libre (fricción alta,
 * "tipear números"), el Wizard de perfilamiento (app/onboarding/wizard/page.tsx)
 * pide elegir un RANGO como tarjeta seleccionable. Cada banda tiene un valor
 * `representative` — el número que efectivamente alimenta el motor de scoring
 * determinístico (`lib/scoring.ts`, que espera `monthlySalary`/`savingsAmount`/
 * `totalDebtBalance` como números, no bandas) en vez de que el cliente
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

/**
 * Saldo TOTAL de deuda de corto plazo vigente (CLP) — no la cuota mensual.
 * Alimenta `CustomerFinancialProfile.totalDebtBalance`. Se pide el saldo total
 * (en vez de la cuota mensual) porque es el dato que la banca usa para el
 * parámetro de Leverage (deuda corto plazo / ingresos), y de aquí se deriva
 * también una cuota mensual estimada para el parámetro de Carga Financiera
 * (ver `lib/uf-preevaluation.ts` y `lib/scoring.ts`).
 */
export const DEBT_BALANCE_BANDS: FinancialBand[] = [
  { id: "d1", label: "Menos de $2.000.000", representative: 1_000_000 },
  { id: "d2", label: "$2.000.000 - $5.000.000", representative: 3_500_000 },
  { id: "d3", label: "$5.000.000 - $10.000.000", representative: 7_500_000 },
  { id: "d4", label: "$10.000.000 - $20.000.000", representative: 15_000_000 },
  { id: "d5", label: "Más de $20.000.000", representative: 25_000_000 },
];
