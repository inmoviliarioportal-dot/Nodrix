/**
 * Autosave helper para el Wizard de Perfilamiento (localStorage).
 *
 * MVP: un solo blob JSON versionado. Si el shape cambia en el futuro,
 * bump `WIZARD_STORAGE_VERSION` e invalida progreso viejo en vez de migrarlo.
 */

export const WIZARD_STORAGE_KEY = "wizard-progress";
// v3: monthlyIncome/investmentType/propertyStatus se movieron del registro
// al wizard (Paso 2, como rangos/tarjetas -- ver lib/financial-bands.ts), y
// el ahorro/deuda numéricos del Paso 2 anterior (ahora Paso 3) también pasan
// a ser rangos. Progreso guardado con el shape viejo (v2, números libres) se
// descarta (ver `loadWizardProgress`) en vez de migrarse -- mismo patrón que
// la v2 anterior.
// v4: se agregan los campos de aval/codeudor (Paso 3) -- progreso v3 se
// descarta igual que en el bump anterior, no vale la pena migrar un wizard a
// medio llenar.
// v5: `debtBandId` (cuota mensual de deuda) pasa a `totalDebtBalanceBandId`
// (saldo TOTAL de deuda de corto plazo) -- lo pide la banca para el
// parámetro de Leverage (ver lib/uf-preevaluation.ts). Progreso v4 se
// descarta igual que en los bumps anteriores.
// v6: `salaryBandId` (un solo sueldo) pasa a `incomeSources` (uno o más
// tipos de ingreso mixtos: sueldo fijo/boleta/pensión/alquiler/sociedad,
// ver lib/income-types.ts). Progreso v5 se descarta igual que en los bumps
// anteriores.
// v7: se agrega `professionalLevel` (Paso 1) -- tope cualitativo sobre la
// probabilidad de aprobación (ver lib/proposal-risk.ts). Progreso v6 se
// descarta igual que en los bumps anteriores.
// v8: los campos de RANGO/BANDA (amountBandId, savingsBandId,
// totalDebtBalanceBandId, avalSalaryBandId) pasan a montos EXACTOS
// (monthlyAmountCLP, savingsAmount, totalDebtBalance, avalMonthlySalary)
// elegidos en un desplegable (ver lib/amount-options.ts) en vez de estimar
// un rango -- mejora la precisión de la pre-evaluación en UF. Progreso v7
// se descarta igual que en los bumps anteriores.
const WIZARD_STORAGE_VERSION = 8;

/** Mismos 2 valores EXACTOS que `ProfessionalLevel` en lib/proposal-risk.ts */
export type WizardProfessionalLevel = "profesional" | "tecnico";

/** Mismos 4 valores EXACTOS que `CustomerFinancialProfile.employmentType` en lib/scoring.ts */
export type WizardEmploymentType =
  | "indefinido"
  | "plazo_fijo"
  | "honorarios"
  | "independiente";

/** Mismos 5 valores EXACTOS que `IncomeType` en lib/income-types.ts */
export type WizardIncomeType = "sueldo_fijo" | "boleta" | "pension" | "alquiler" | "sociedad";

/**
 * Una fuente de ingreso declarada en el wizard -- el cliente puede declarar
 * más de una (ingreso mixto). `monthlyAmountCLP` es el monto EXACTO elegido
 * en un desplegable (ver lib/amount-options.ts), no una banda/rango
 * estimado. Los campos específicos por tipo solo aplican al tipo
 * correspondiente (ver lib/income-types.ts para el detalle de cada uno).
 */
export interface WizardIncomeSourceEntry {
  type: WizardIncomeType;
  monthlyAmountCLP: number | null;
  /** sueldo_fijo: ingreso mayoritariamente por bonos (no por sueldo base). */
  hasSignificantBonusIncome: boolean | null;
  /** boleta: ingreso que varía durante el año (vs. monto fijo mensual). */
  isVariableBoleta: boolean | null;
  /** alquiler: duración declarada del contrato de arriendo, en meses. */
  rentalContractMonths: number | null;
  /** sociedad: la empresa acredita liquidez / cierres positivos (SII 104/105). */
  companyHasLiquidity: boolean | null;
}

export function emptyIncomeSourceEntry(type: WizardIncomeType): WizardIncomeSourceEntry {
  return {
    type,
    monthlyAmountCLP: null,
    hasSignificantBonusIncome: null,
    isVariableBoleta: null,
    rentalContractMonths: null,
    companyHasLiquidity: null,
  };
}

/** Mismos 3 valores EXACTOS que antes validaba POST /api/auth/register (ver components/auth/schemas.ts) */
export type WizardInvestmentType = "inversion" | "vivienda_propia" | "ambos";

/** Mismos 5 valores EXACTOS que antes validaba POST /api/auth/register */
export type WizardPropertyStatus =
  | "en_verde"
  | "en_blanco"
  | "usado"
  | "entrega_inmediata"
  | "sin_definir";

export interface WizardData {
  // Paso 1
  employmentType: WizardEmploymentType | null;
  employmentYears: number | null;
  /** Tope cualitativo sobre la probabilidad de aprobación (ver lib/proposal-risk.ts). */
  professionalLevel: WizardProfessionalLevel | null;
  // Paso 2
  incomeSources: WizardIncomeSourceEntry[];
  investmentType: WizardInvestmentType | null;
  propertyStatus: WizardPropertyStatus | null;
  // Paso 3
  savingsAmount: number | null;
  hasExistingDebt: boolean | null;
  /** Saldo TOTAL de deuda de corto plazo (no la cuota mensual) -- monto exacto. */
  totalDebtBalance: number | null;
  // Paso 3 -- aval/codeudor. Los bancos chilenos típicamente solo aceptan
  // parentescos cercanos como aval hipotecario (cónyuge, padre, madre, hijo,
  // hermano) -- ver WizardAvalRelationship.
  hasAval: boolean | null;
  avalRelationship: string | null;
  avalMonthlySalary: number | null;
  avalEmploymentType: WizardEmploymentType | null;
}

export interface WizardProgress {
  version: number;
  step: number;
  data: WizardData;
}

export const WIZARD_INITIAL_DATA: WizardData = {
  employmentType: null,
  employmentYears: null,
  professionalLevel: null,
  incomeSources: [],
  investmentType: null,
  propertyStatus: null,
  savingsAmount: null,
  hasExistingDebt: null,
  totalDebtBalance: null,
  hasAval: null,
  avalRelationship: null,
  avalMonthlySalary: null,
  avalEmploymentType: null,
};

export function saveWizardProgress(step: number, data: WizardData): void {
  if (typeof window === "undefined") return;
  try {
    const payload: WizardProgress = { version: WIZARD_STORAGE_VERSION, step, data };
    window.localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // localStorage puede fallar (modo privado, cuota, etc.) — el autosave es
    // "best effort", nunca debe romper el flujo del wizard.
  }
}

export function loadWizardProgress(): WizardProgress | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(WIZARD_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WizardProgress;
    if (parsed.version !== WIZARD_STORAGE_VERSION) return null;
    return { ...parsed, data: { ...WIZARD_INITIAL_DATA, ...parsed.data } };
  } catch {
    return null;
  }
}

export function clearWizardProgress(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(WIZARD_STORAGE_KEY);
  } catch {
    // no-op
  }
}
