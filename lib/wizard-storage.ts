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
const WIZARD_STORAGE_VERSION = 4;

/** Mismos 4 valores EXACTOS que `CustomerFinancialProfile.employmentType` en lib/scoring.ts */
export type WizardEmploymentType =
  | "indefinido"
  | "plazo_fijo"
  | "honorarios"
  | "independiente";

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
  // Paso 2
  salaryBandId: string | null;
  investmentType: WizardInvestmentType | null;
  propertyStatus: WizardPropertyStatus | null;
  // Paso 3
  savingsBandId: string | null;
  hasExistingDebt: boolean | null;
  debtBandId: string | null;
  // Paso 3 -- aval/codeudor. Los bancos chilenos típicamente solo aceptan
  // parentescos cercanos como aval hipotecario (cónyuge, padre, madre, hijo,
  // hermano) -- ver WizardAvalRelationship.
  hasAval: boolean | null;
  avalRelationship: string | null;
  avalSalaryBandId: string | null;
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
  salaryBandId: null,
  investmentType: null,
  propertyStatus: null,
  savingsBandId: null,
  hasExistingDebt: null,
  debtBandId: null,
  hasAval: null,
  avalRelationship: null,
  avalSalaryBandId: null,
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
