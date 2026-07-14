/**
 * Autosave helper para el Wizard de Perfilamiento (localStorage).
 *
 * MVP: un solo blob JSON versionado. Si el shape cambia en el futuro,
 * bump `WIZARD_STORAGE_VERSION` e invalida progreso viejo en vez de migrarlo.
 */

export const WIZARD_STORAGE_KEY = "wizard-progress";
const WIZARD_STORAGE_VERSION = 1;

export type WizardPurpose = "INVERSION" | "VIVIR";

/** Mismos 4 valores EXACTOS que `CustomerFinancialProfile.employmentType` en lib/scoring.ts */
export type WizardEmploymentType =
  | "indefinido"
  | "plazo_fijo"
  | "honorarios"
  | "independiente";

export interface WizardData {
  // Paso 0 (contacto)
  name: string;
  email: string;
  phone: string;
  // Paso 1
  purpose: WizardPurpose | null;
  // Paso 2
  monthlySalary: number | null;
  // Paso 3
  employmentType: WizardEmploymentType | null;
  employmentYears: number | null;
  // Paso 4
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
  name: "",
  email: "",
  phone: "",
  purpose: null,
  monthlySalary: null,
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
