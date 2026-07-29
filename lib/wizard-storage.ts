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
// v9: se elimina `employmentType`/`employmentYears` como pregunta genérica
// del Paso 1 -- ahora el Paso 1 identifica el/los PERFIL(es) laboral(es) del
// cliente (empleado/socio/independiente/pensionado/arrendador, el mismo
// concepto que antes vivía en `incomeSources` del Paso 2) y anida ahí las
// preguntas cualitativas de cada perfil (contrato + antigüedad si es
// empleado, antigüedad para todos los perfiles, bono/variable/liquidez
// según corresponda). El Paso 2 ("Finanzas") ya no vuelve a preguntar el
// tipo -- solo habilita el monto exacto de cada perfil ya elegido. Progreso
// v8 se descarta igual que en los bumps anteriores.
// v10: "¿Qué buscas?" (investmentType elegido directamente) pasa a
// `propertyDestination` (vivir/airbnb/alquiler_tradicional/venta_corto_plazo)
// -- una pregunta más concreta sobre el USO que el cliente le dará al
// inmueble. `investmentType` se sigue derivando (vivir -> vivienda_propia,
// el resto -> inversion) para no romper el motor de scoring/pre-evaluación,
// pero ya no se pregunta directamente. Progreso v9 se descarta igual que en
// los bumps anteriores.
const WIZARD_STORAGE_VERSION = 10;

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
 * Un perfil laboral/fuente de ingreso declarado en el wizard -- el cliente
 * puede declarar más de uno (perfil mixto, ej. empleado + arrendador).
 * `monthlyAmountCLP` (Paso 2, "Finanzas") es el monto EXACTO elegido en un
 * desplegable (ver lib/amount-options.ts). El resto de los campos son
 * CUALITATIVOS y se piden en el Paso 1 ("Tu perfil"), anidados bajo cada
 * tipo elegido -- ver lib/income-types.ts para el detalle de negocio de
 * cada uno.
 */
export interface WizardIncomeSourceEntry {
  type: WizardIncomeType;
  /** Paso 2: monto mensual exacto de este perfil. */
  monthlyAmountCLP: number | null;
  /** Paso 1, TODOS los tipos: hace cuánto tiempo tiene este ingreso/actividad
   * (alimenta `CustomerFinancialProfile.employmentYears` -- ver
   * `deriveEmployment` en app/onboarding/wizard/page.tsx). */
  antiguedadYears: number | null;
  /** Paso 1, SOLO sueldo_fijo: tipo de contrato (indefinido/plazo_fijo). */
  contractType: WizardEmploymentType | null;
  /** Paso 1, sueldo_fijo: ingreso mayoritariamente por bonos (no por sueldo base). */
  hasSignificantBonusIncome: boolean | null;
  /** Paso 1, boleta: ingreso que varía durante el año (vs. monto fijo mensual). */
  isVariableBoleta: boolean | null;
  /** Paso 1, alquiler: duración declarada del contrato de arriendo, en meses. */
  rentalContractMonths: number | null;
  /** Paso 1, sociedad: la empresa acredita liquidez / cierres positivos (SII 104/105). */
  companyHasLiquidity: boolean | null;
}

export function emptyIncomeSourceEntry(type: WizardIncomeType): WizardIncomeSourceEntry {
  return {
    type,
    monthlyAmountCLP: null,
    antiguedadYears: null,
    contractType: null,
    hasSignificantBonusIncome: null,
    isVariableBoleta: null,
    rentalContractMonths: null,
    companyHasLiquidity: null,
  };
}

/** Mismos 3 valores EXACTOS que antes validaba POST /api/auth/register (ver components/auth/schemas.ts) */
export type WizardInvestmentType = "inversion" | "vivienda_propia" | "ambos";

/**
 * Destino real que el cliente le dará al inmueble -- reemplaza la pregunta
 * genérica "¿Qué buscas?" (investmentType) por algo más accionable: define
 * qué preferencias se piden DESPUÉS de la evaluación y qué carrusel de
 * propiedades ve el cliente (ver app/onboarding/initial-proposal/page.tsx y
 * components/dashboard/PropertyPreferencesCard.tsx).
 */
export type WizardPropertyDestination = "vivir" | "airbnb" | "alquiler_tradicional" | "venta_corto_plazo";

/** Mismos 5 valores EXACTOS que antes validaba POST /api/auth/register */
export type WizardPropertyStatus =
  | "en_verde"
  | "en_blanco"
  | "usado"
  | "entrega_inmediata"
  | "sin_definir";

export interface WizardData {
  // Paso 1: identifica el/los perfil(es) laboral(es) (empleado/socio/
  // independiente/pensionado/arrendador) y sus preguntas cualitativas
  // anidadas -- ver WizardIncomeSourceEntry.
  incomeSources: WizardIncomeSourceEntry[];
  /** Tope cualitativo sobre la probabilidad de aprobación (ver lib/proposal-risk.ts). */
  professionalLevel: WizardProfessionalLevel | null;
  // Paso 2: SOLO montos (ver `incomeSources[].monthlyAmountCLP`) + qué busca.
  /** Derivado de `propertyDestination` (vivir -> vivienda_propia, resto -> inversion). */
  investmentType: WizardInvestmentType | null;
  propertyDestination: WizardPropertyDestination | null;
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
  professionalLevel: null,
  incomeSources: [],
  investmentType: null,
  propertyDestination: null,
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
