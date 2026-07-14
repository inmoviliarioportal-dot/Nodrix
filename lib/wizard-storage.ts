/**
 * Autosave helper para el Wizard de Perfilamiento (localStorage).
 *
 * MVP: un solo blob JSON versionado. Si el shape cambia en el futuro,
 * bump `WIZARD_STORAGE_VERSION` e invalida progreso viejo en vez de migrarlo.
 */

export const WIZARD_STORAGE_KEY = "wizard-progress";
// v2: el wizard dejó de pedir propósito/renta/contacto -- esos datos ya se
// capturan en el registro extendido (nombre, email, teléfono, renta, tipo de
// inversión). Progreso guardado con el shape viejo se descarta (ver
// `loadWizardProgress`) en vez de migrarse.
const WIZARD_STORAGE_VERSION = 2;

/** Mismos 4 valores EXACTOS que `CustomerFinancialProfile.employmentType` en lib/scoring.ts */
export type WizardEmploymentType =
  | "indefinido"
  | "plazo_fijo"
  | "honorarios"
  | "independiente";

export interface WizardData {
  // Paso 1
  employmentType: WizardEmploymentType | null;
  employmentYears: number | null;
  // Paso 2
  savingsAmount: number | null;
  hasExistingDebt: boolean | null;
  monthlyDebtPayments: number | null;
}

export interface WizardProgress {
  version: number;
  step: number;
  data: WizardData;
}

export const WIZARD_INITIAL_DATA: WizardData = {
  employmentType: null,
  employmentYears: null,
  savingsAmount: null,
  hasExistingDebt: null,
  monthlyDebtPayments: null,
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
