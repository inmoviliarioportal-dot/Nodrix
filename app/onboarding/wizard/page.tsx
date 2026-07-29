"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Briefcase, PiggyBank, Home, Check, X, Users } from "lucide-react";
import { SelectableCard } from "@/components/wizard/SelectableCard";
import { SelectableChip } from "@/components/wizard/SelectableChip";
import { AmountSelect } from "@/components/wizard/AmountSelect";
import { WizardProgress } from "@/components/wizard/WizardProgress";
import { PROPERTY_STATUS_OPTIONS } from "@/components/auth/schemas";
import { INCOME_AMOUNT_OPTIONS } from "@/lib/amount-options";
import {
  WIZARD_INITIAL_DATA,
  clearWizardProgress,
  loadWizardProgress,
  saveWizardProgress,
  emptyIncomeSourceEntry,
  type WizardData,
  type WizardEmploymentType,
  type WizardIncomeType,
  type WizardIncomeSourceEntry,
  type WizardProfessionalLevel,
  type WizardPropertyDestination,
  type WizardInvestmentType,
} from "@/lib/wizard-storage";

/**
 * Destino real del inmueble -- reemplaza la vieja pregunta genérica "¿Qué
 * buscas?" (investmentType). Determina qué se pregunta DESPUÉS de la
 * evaluación (housing vs. perfilamiento de rentabilidad) y qué carrusel de
 * propiedades ve el cliente (ver app/onboarding/initial-proposal/page.tsx).
 */
const PROPERTY_DESTINATION_OPTIONS: { label: string; value: WizardPropertyDestination }[] = [
  { label: "Vivir", value: "vivir" },
  { label: "Airbnb", value: "airbnb" },
  { label: "Alquiler tradicional", value: "alquiler_tradicional" },
  { label: "Venta a corto plazo", value: "venta_corto_plazo" },
];

/** vivir -> vivienda_propia; el resto son variantes de rentabilidad -> inversion. */
function deriveInvestmentType(destination: WizardPropertyDestination | null): WizardInvestmentType | null {
  if (destination === null) return null;
  return destination === "vivir" ? "vivienda_propia" : "inversion";
}
import type { IncomeSource } from "@/lib/income-types";

/**
 * Los 5 perfiles laborales/fuente de ingreso que evalúa la banca -- ver
 * lib/income-types.ts. Se piden en el Paso 1 ("Tu perfil") junto con sus
 * preguntas cualitativas anidadas (contrato, antigüedad, bono/variable/
 * liquidez); el Paso 2 ("Finanzas") solo pide el monto exacto de cada uno.
 */
const INCOME_TYPE_OPTIONS: { label: string; value: WizardIncomeType }[] = [
  { label: "Empleado (dependiente)", value: "sueldo_fijo" },
  { label: "Socio o dueño de empresa", value: "sociedad" },
  { label: "Independiente (boleta)", value: "boleta" },
  { label: "Pensionado", value: "pension" },
  { label: "Arrendador", value: "alquiler" },
];

/** Tope cualitativo sobre la probabilidad de aprobación -- ver lib/proposal-risk.ts. */
const PROFESSIONAL_LEVEL_OPTIONS: { label: string; description: string; value: WizardProfessionalLevel }[] = [
  { label: "Profesional / Ingeniero", description: "Título profesional universitario", value: "profesional" },
  { label: "Técnico", description: "Título técnico o sin título", value: "tecnico" },
];

/** Solo aplica al perfil "Empleado" -- socio/independiente/pensionado/
 * arrendador no tienen un empleador con quien firmar un contrato. */
const CONTRACT_TYPE_OPTIONS: { label: string; description: string; value: WizardEmploymentType }[] = [
  { label: "Indefinido", description: "Contrato indefinido", value: "indefinido" },
  { label: "Plazo fijo", description: "Contrato a plazo fijo", value: "plazo_fijo" },
];

const RENTAL_CONTRACT_OPTIONS: { label: string; value: number }[] = [
  { label: "Menos de 6 meses", value: 3 },
  { label: "6 a 11 meses", value: 6 },
  { label: "12 meses o más", value: 12 },
];

/** Parentescos que los bancos chilenos típicamente aceptan como aval/codeudor
 * válido para un crédito hipotecario -- se limita a estos 5, sin "otro"
 * genérico, tal como pidió el negocio. */
const AVAL_RELATIONSHIP_OPTIONS: { label: string; value: string }[] = [
  { label: "Cónyuge/Conviviente civil", value: "conyuge" },
  { label: "Padre", value: "padre" },
  { label: "Madre", value: "madre" },
  { label: "Hijo/a", value: "hijo" },
  { label: "Hermano/a", value: "hermano" },
];

/** Mismas 4 opciones usadas para el contrato del aval (a él sí se le puede
 * preguntar honorarios/independiente porque no es "su" perfil laboral el que
 * determina las preguntas anidadas del cliente). */
const EMPLOYMENT_OPTIONS: { label: string; description: string; value: WizardEmploymentType }[] = [
  { label: "Indefinido", description: "Contrato indefinido", value: "indefinido" },
  { label: "Plazo fijo", description: "Contrato a plazo fijo", value: "plazo_fijo" },
  { label: "Honorarios", description: "Boletas de honorarios", value: "honorarios" },
  { label: "Independiente", description: "Trabajo por cuenta propia", value: "independiente" },
];

const YEARS_OPTIONS: { label: string; value: number }[] = [
  { label: "Menos de 1 año", value: 0.5 },
  { label: "1 a 2 años", value: 1.5 },
  { label: "2 a 5 años", value: 3 },
  { label: "5 años o más", value: 6 },
];

/**
 * Resuelve el `employmentType`/`employmentYears` ÚNICO que necesita el motor
 * de scoring (`CustomerFinancialProfile`, lib/scoring.ts) a partir de los
 * perfiles laborales mixtos declarados en el Paso 1. Prioridad: si el
 * cliente declaró "Empleado" (sueldo_fijo), se usa SU contrato/antigüedad
 * (el dato más verificable). Si no, "Independiente (boleta)" mapea a
 * "honorarios". Si tampoco, se usa el primer perfil restante (socio/
 * pensionado/arrendador) mapeado a "independiente" -- ninguno depende de un
 * empleador.
 */
function deriveEmployment(entries: WizardIncomeSourceEntry[]): { employmentType: WizardEmploymentType; employmentYears: number } | null {
  const empleado = entries.find((e) => e.type === "sueldo_fijo");
  if (empleado && empleado.contractType && empleado.antiguedadYears !== null) {
    return { employmentType: empleado.contractType, employmentYears: empleado.antiguedadYears };
  }
  const boleta = entries.find((e) => e.type === "boleta");
  if (boleta && boleta.antiguedadYears !== null) {
    return { employmentType: "honorarios", employmentYears: boleta.antiguedadYears };
  }
  const other = entries.find((e) => e.antiguedadYears !== null);
  if (other) {
    return { employmentType: "independiente", employmentYears: other.antiguedadYears! };
  }
  return null;
}

/**
 * Reconstruye las fuentes de ingreso del wizard (modo edición) a partir del
 * `income_sources` crudo persistido en la application (ver migración
 * 021_application_income_sources.sql). Si la application es de antes de
 * este cambio (columna null) hace un mejor esfuerzo con un solo sueldo fijo
 * a partir de `customers.monthly_income`, que es lo único que existía antes.
 * Los montos se precargan EXACTOS. `antiguedadYears`/`contractType` no se
 * persisten hoy (no son parte de `IncomeSource`), así que quedan en null --
 * el cliente los vuelve a confirmar en modo edición.
 */
function prefillIncomeSources(
  rawIncomeSources: unknown,
  monthlyIncome: number | null | undefined
): WizardIncomeSourceEntry[] | null {
  if (Array.isArray(rawIncomeSources) && rawIncomeSources.length > 0) {
    return rawIncomeSources.map((raw) => {
      const r = raw as Partial<IncomeSource> & Record<string, unknown>;
      const entry = emptyIncomeSourceEntry((r.type as WizardIncomeType) ?? "sueldo_fijo");
      entry.monthlyAmountCLP = typeof r.monthlyAmountCLP === "number" ? r.monthlyAmountCLP : null;
      entry.hasSignificantBonusIncome = (r.hasSignificantBonusIncome as boolean) ?? null;
      entry.isVariableBoleta = (r.isVariableBoleta as boolean) ?? null;
      entry.rentalContractMonths = (r.rentalContractMonths as number) ?? null;
      entry.companyHasLiquidity = (r.companyHasLiquidity as boolean) ?? null;
      return entry;
    });
  }
  if (typeof monthlyIncome === "number") {
    const entry = emptyIncomeSourceEntry("sueldo_fijo");
    entry.monthlyAmountCLP = monthlyIncome;
    entry.hasSignificantBonusIncome = false;
    return [entry];
  }
  return null;
}

/** Clave sessionStorage usada para pasar el payload completo del lead a
 * /onboarding/processing (pantalla de AI Processing, otro agente).
 * IMPORTANTE: Coincide con INPUT_KEY esperada por processing/page.tsx. */
export const WIZARD_PAYLOAD_STORAGE_KEY = "wizard-progress";

const TOTAL_STEPS = 3;
const STEP_LABELS = ["Perfil", "Finanzas", "Ahorro"];

/** Datos del cliente ya recolectados en el registro -- el wizard NO vuelve a
 * pedirlos, solo los reutiliza para armar el payload final de POST /api/leads.
 * Ver app/auth/register/page.tsx. Nota: `monthlyIncome` ya NO se pide en el
 * registro (se movió a este wizard como `incomeSources`, Paso 2 -- ver
 * lib/income-types.ts), así que `RegisteredProfile` ya no incluye un
 * salario -- se resuelve desde las bandas elegidas en `handleNext`. */
interface RegisteredProfile {
  name: string;
  email: string;
  phone: string;
  rut: string | null;
  /** Ya calculada en el registro (customers.age) -- se reutiliza para el
   * tramo etario de ingresos por pensión (lib/income-types.ts), no se
   * vuelve a preguntar en el wizard. */
  age: number | null;
}

export default function WizardPage() {
  return (
    <Suspense fallback={null}>
      <WizardPageInner />
    </Suspense>
  );
}

function WizardPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEditMode = searchParams.get("edit") === "true";
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>(WIZARD_INITIAL_DATA);
  const [transitioning, setTransitioning] = useState(false);
  const [profile, setProfile] = useState<RegisteredProfile | null>(null);
  const [profileError, setProfileError] = useState(false);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const hasRestored = useRef(false);

  // Restaurar progreso guardado en localStorage al montar (solo en modo
  // normal -- en modo edición precargamos desde la application/customer
  // reales en vez de un progreso a medio llenar).
  useEffect(() => {
    if (!isEditMode) {
      const saved = loadWizardProgress();
      if (saved) {
        setStep(saved.step);
        setData(saved.data);
      }
    }
    hasRestored.current = true;

    // El wizard ya no pide nombre/email/teléfono/renta -- vienen del
    // registro extendido. Si por alguna razón no hay sesión (o falta el
    // registro extendido), avisamos en vez de enviar un lead incompleto.
    fetch("/api/auth/user")
      .then((res) => (res.ok ? res.json() : null))
      .then(async (json) => {
        const customer = json?.customer;
        const user = json?.user;
        if (!customer && !user) {
          setProfileError(true);
          return;
        }
        setProfile({
          name: customer?.name ?? "",
          email: user?.email ?? customer?.email ?? "",
          phone: customer?.phone ?? "",
          rut: customer?.rut_ciphertext ?? null,
          age: typeof customer?.age === "number" ? customer.age : null,
        });

        if (isEditMode && customer?.id) {
          // Precarga: busca la application actual del cliente (mismo patrón
          // de fallback que app/onboarding/initial-proposal/page.tsx).
          try {
            const appsRes = await fetch(`/api/applications?customer_id=${customer.id}&limit=1`);
            if (appsRes.ok) {
              const { applications } = await appsRes.json();
              const app = applications?.[0];
              if (app?.id) {
                setApplicationId(app.id);
                setData((prev) => ({
                  ...prev,
                  incomeSources: prefillIncomeSources(app.income_sources, customer.monthly_income) ?? prev.incomeSources,
                  professionalLevel: customer.professional_level ?? prev.professionalLevel,
                  investmentType: customer.investment_type ?? prev.investmentType,
                  propertyDestination: customer.property_destination ?? prev.propertyDestination,
                  propertyStatus: customer.property_status ?? prev.propertyStatus,
                  savingsAmount: typeof app.savings_amount === "number" ? app.savings_amount : prev.savingsAmount,
                }));
              }
            }
          } catch {
            // best-effort: si falla la precarga, el cliente igual puede
            // llenar el wizard desde cero.
          }
        }
      })
      .catch(() => setProfileError(true));
  }, [isEditMode]);

  // Autosave cada vez que cambian los datos o el paso (tras la restauración
  // inicial) -- solo en modo normal, en modo edición no queremos pisar el
  // progreso guardado de un eventual wizard normal en curso.
  useEffect(() => {
    if (!hasRestored.current || isEditMode) return;
    saveWizardProgress(step, data);
  }, [step, data, isEditMode]);

  function update<K extends keyof WizardData>(key: K, value: WizardData[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  function goToStep(next: number) {
    setTransitioning(true);
    window.setTimeout(() => {
      setStep(next);
      setTransitioning(false);
    }, 150);
  }

  function canAdvance(): boolean {
    switch (step) {
      case 1: {
        if (data.incomeSources.length === 0 || data.professionalLevel === null) return false;
        return data.incomeSources.every((entry) => {
          if (entry.antiguedadYears === null) return false;
          if (entry.type === "sueldo_fijo") return entry.contractType !== null && entry.hasSignificantBonusIncome !== null;
          if (entry.type === "boleta") return entry.isVariableBoleta !== null;
          if (entry.type === "alquiler") return entry.rentalContractMonths !== null;
          if (entry.type === "sociedad") return entry.companyHasLiquidity !== null;
          return true; // pension: solo antigüedad
        });
      }
      case 2: {
        if (data.propertyDestination === null || data.propertyStatus === null) return false;
        return data.incomeSources.every((entry) => entry.monthlyAmountCLP !== null);
      }
      case 3:
        if (data.savingsAmount === null || data.hasExistingDebt === null) return false;
        if (data.hasExistingDebt && data.totalDebtBalance === null) return false;
        if (data.hasAval === null) return false;
        if (data.hasAval && (!data.avalRelationship || data.avalMonthlySalary === null || !data.avalEmploymentType)) {
          return false;
        }
        return true;
      default:
        return false;
    }
  }

  async function handleNext() {
    if (!canAdvance()) return;

    if (step < TOTAL_STEPS) {
      goToStep(step + 1);
      return;
    }

    if (!profile || !profile.name || !profile.email) {
      setProfileError(true);
      return;
    }

    // Cada perfil laboral/fuente de ingreso declarado (mixto) se resuelve a
    // un IncomeSource real -- ver lib/income-types.ts. La edad para pensión
    // viene del registro (profile.age), no se vuelve a preguntar. Los
    // montos ya son EXACTOS (elegidos en un desplegable).
    const incomeSources: IncomeSource[] = data.incomeSources.map((entry) => {
      const source: IncomeSource = { type: entry.type, monthlyAmountCLP: entry.monthlyAmountCLP ?? 0 };
      if (entry.type === "sueldo_fijo") source.hasSignificantBonusIncome = entry.hasSignificantBonusIncome ?? false;
      if (entry.type === "boleta") source.isVariableBoleta = entry.isVariableBoleta ?? false;
      if (entry.type === "pension") source.ageYears = profile?.age ?? undefined;
      if (entry.type === "alquiler") source.rentalContractMonths = entry.rentalContractMonths ?? 0;
      if (entry.type === "sociedad") source.companyHasLiquidity = entry.companyHasLiquidity ?? false;
      return source;
    });

    // Un solo employmentType/employmentYears para el motor de scoring
    // (factor Estabilidad Laboral) -- ver deriveEmployment más arriba.
    const derivedEmployment = deriveEmployment(data.incomeSources) ?? {
      employmentType: "independiente" as WizardEmploymentType,
      employmentYears: 0,
    };

    const savingsRepresentative = data.savingsAmount;
    const debtRepresentative = data.hasExistingDebt ? (data.totalDebtBalance ?? 0) : 0;
    const avalSalaryRepresentative = data.hasAval ? data.avalMonthlySalary : null;

    if (isEditMode) {
      // Modo edición: llama directamente al endpoint de actualización (no
      // pasa por sessionStorage ni por la pantalla de AI Processing) y
      // vuelve a /onboarding/initial-proposal para que el cliente vea su UF
      // recalculado.
      if (!applicationId) {
        setProfileError(true);
        return;
      }

      setSubmitting(true);
      try {
        const res = await fetch(`/api/applications/${applicationId}/update-financial-profile`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employmentType: derivedEmployment.employmentType,
            employmentYears: derivedEmployment.employmentYears,
            professionalLevel: data.professionalLevel,
            incomeSources,
            savingsAmount: savingsRepresentative,
            hasExistingDebt: data.hasExistingDebt,
            totalDebtBalance: debtRepresentative,
            investmentType: deriveInvestmentType(data.propertyDestination),
            propertyDestination: data.propertyDestination,
            propertyStatus: data.propertyStatus,
            hasAval: data.hasAval,
            avalRelationship: data.hasAval ? data.avalRelationship : undefined,
            avalMonthlySalary: data.hasAval ? avalSalaryRepresentative : undefined,
            avalEmploymentType: data.hasAval ? data.avalEmploymentType : undefined,
          }),
        });
        if (!res.ok) {
          setProfileError(true);
          return;
        }
        router.push("/onboarding/initial-proposal");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Paso final (flujo normal): arma el payload EXACTO del contrato de
    // POST /api/leads y lo pasa a la pantalla de AI Processing vía
    // sessionStorage. Este componente NO llama a /api/leads directamente —
    // eso lo hace /onboarding/processing. name/email/phone/rut vienen del
    // registro (no se piden de nuevo acá).
    const payload = {
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      rut: profile.rut,
      incomeSources,
      savingsAmount: savingsRepresentative,
      employmentType: derivedEmployment.employmentType,
      employmentYears: derivedEmployment.employmentYears,
      professionalLevel: data.professionalLevel,
      hasExistingDebt: data.hasExistingDebt,
      totalDebtBalance: debtRepresentative,
      investmentType: deriveInvestmentType(data.propertyDestination),
      propertyDestination: data.propertyDestination,
      propertyStatus: data.propertyStatus,
      hasAval: data.hasAval,
      avalRelationship: data.hasAval ? data.avalRelationship : undefined,
      avalMonthlySalary: data.hasAval ? avalSalaryRepresentative : undefined,
      avalEmploymentType: data.hasAval ? data.avalEmploymentType : undefined,
    };

    try {
      window.sessionStorage.setItem(WIZARD_PAYLOAD_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // sessionStorage no disponible: seguimos igual, la pantalla siguiente
      // deberá manejar el caso "sin payload" (best effort, no crítico aquí).
    }

    clearWizardProgress();
    router.push("/onboarding/simulating");
  }

  function handleBack() {
    if (step === 1) return;
    goToStep(step - 1);
  }

  return (
    <main className="bg-deep-ambient flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <WizardProgress step={step} totalSteps={TOTAL_STEPS} labels={STEP_LABELS} />

        {profileError && (
          <div
            className="mb-6 rounded-xl border p-4 text-center text-sm"
            style={{ borderColor: "#EF4444", color: "#EF4444" }}
          >
            No pudimos cargar tus datos de registro. Inicia sesión nuevamente para continuar.
          </div>
        )}

        <div
          className="transition-opacity duration-150 ease-out"
          style={{ opacity: transitioning ? 0 : 1 }}
        >
          {step === 1 && <StepProfile data={data} onChange={update} />}
          {step === 2 && <StepFinancialProfile data={data} onChange={update} />}
          {step === 3 && <StepSavings data={data} onChange={update} />}
        </div>

        <div
          className="mt-9 flex items-center justify-between gap-4 border-t pt-5"
          style={{ borderColor: "var(--glass-border)" }}
        >
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 1}
            className="rounded-xl border px-6 py-3 text-sm font-medium transition-all duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-30"
            style={{ borderColor: "var(--glass-border)", color: "var(--text-secondary)" }}
          >
            Atrás
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={!canAdvance() || submitting}
            className="glow-purple rounded-xl px-8 py-3 text-sm font-semibold transition-all duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-30"
            style={{
              backgroundColor: "var(--neon-purple)",
              color: "var(--deep)",
            }}
          >
            {submitting ? "Guardando..." : step === TOTAL_STEPS ? "Finalizar" : "Siguiente"}
          </button>
        </div>
      </div>
    </main>
  );
}

/**
 * Paso 1: identifica el/los perfil(es) laboral(es) del cliente (empleado,
 * socio, independiente, pensionado, arrendador -- puede ser más de uno) y
 * anida ahí sus preguntas cualitativas (contrato + antigüedad si es
 * empleado, antigüedad para todos, bono/variable/liquidez según
 * corresponda). El nivel profesional se pregunta una sola vez, aparte,
 * porque aplica sin importar el perfil elegido.
 */
function StepProfile({
  data,
  onChange,
}: {
  data: WizardData;
  onChange: <K extends keyof WizardData>(key: K, value: WizardData[K]) => void;
}) {
  function toggleType(type: WizardIncomeType) {
    const exists = data.incomeSources.some((e) => e.type === type);
    if (exists) {
      onChange(
        "incomeSources",
        data.incomeSources.filter((e) => e.type !== type)
      );
    } else {
      onChange("incomeSources", [...data.incomeSources, emptyIncomeSourceEntry(type)]);
    }
  }

  function updateEntry(type: WizardIncomeType, patch: Partial<WizardIncomeSourceEntry>) {
    onChange(
      "incomeSources",
      data.incomeSources.map((e) => (e.type === type ? { ...e, ...patch } : e))
    );
  }

  return (
    <section className="flex flex-col gap-8">
      <header className="text-center">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Cuéntanos sobre tu perfil
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--text-tertiary)" }}>
          Identifica tu(s) fuente(s) de ingreso -- puedes elegir más de una si tienes ingresos mixtos.
        </p>
      </header>

      <div>
        <h2
          className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide"
          style={{ color: "var(--text-secondary)" }}
        >
          <Briefcase size={16} /> ¿Cuál es tu situación laboral?
        </h2>
        <div className="flex flex-wrap gap-2">
          {INCOME_TYPE_OPTIONS.map((opt) => (
            <SelectableChip
              key={opt.value}
              label={opt.label}
              selected={data.incomeSources.some((e) => e.type === opt.value)}
              onClick={() => toggleType(opt.value)}
              showCheckWhenSelected
            />
          ))}
        </div>
      </div>

      {data.incomeSources.map((entry) => {
        const typeLabel = INCOME_TYPE_OPTIONS.find((o) => o.value === entry.type)?.label ?? entry.type;
        return (
          <div key={entry.type} className="rounded-xl border p-4" style={{ borderColor: "var(--glass-border)" }}>
            <h3 className="mb-3 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {typeLabel}
            </h3>

            {entry.type === "sueldo_fijo" && (
              <>
                <p className="mb-2 text-xs" style={{ color: "var(--text-tertiary)" }}>
                  Tipo de contrato
                </p>
                <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {CONTRACT_TYPE_OPTIONS.map((opt) => (
                    <SelectableCard
                      key={opt.value}
                      label={opt.label}
                      description={opt.description}
                      selected={entry.contractType === opt.value}
                      onClick={() => updateEntry(entry.type, { contractType: opt.value })}
                    />
                  ))}
                </div>
              </>
            )}

            <p className="mb-2 text-xs" style={{ color: "var(--text-tertiary)" }}>
              ¿Hace cuánto tiempo tienes este ingreso/actividad?
            </p>
            <div className="mb-4 flex flex-wrap gap-2">
              {YEARS_OPTIONS.map((opt) => (
                <SelectableChip
                  key={opt.value}
                  label={opt.label}
                  selected={entry.antiguedadYears === opt.value}
                  onClick={() => updateEntry(entry.type, { antiguedadYears: opt.value })}
                />
              ))}
            </div>

            {entry.type === "sueldo_fijo" && (
              <>
                <p className="mb-2 text-xs" style={{ color: "var(--text-tertiary)" }}>
                  ¿La mayor parte de este ingreso viene de bonos (y no de tu sueldo base)?
                </p>
                <div className="flex flex-wrap gap-2">
                  <SelectableChip
                    label="Sí"
                    icon={Check}
                    selected={entry.hasSignificantBonusIncome === true}
                    onClick={() => updateEntry(entry.type, { hasSignificantBonusIncome: true })}
                  />
                  <SelectableChip
                    label="No"
                    icon={X}
                    selected={entry.hasSignificantBonusIncome === false}
                    onClick={() => updateEntry(entry.type, { hasSignificantBonusIncome: false })}
                  />
                </div>
              </>
            )}

            {entry.type === "boleta" && (
              <>
                <p className="mb-2 text-xs" style={{ color: "var(--text-tertiary)" }}>
                  ¿Este ingreso varía durante el año (en vez de ser un monto fijo cada mes)?
                </p>
                <div className="flex flex-wrap gap-2">
                  <SelectableChip
                    label="Sí, varía"
                    icon={Check}
                    selected={entry.isVariableBoleta === true}
                    onClick={() => updateEntry(entry.type, { isVariableBoleta: true })}
                  />
                  <SelectableChip
                    label="No, es fijo"
                    icon={X}
                    selected={entry.isVariableBoleta === false}
                    onClick={() => updateEntry(entry.type, { isVariableBoleta: false })}
                  />
                </div>
              </>
            )}

            {entry.type === "alquiler" && (
              <>
                <p className="mb-2 text-xs" style={{ color: "var(--text-tertiary)" }}>
                  ¿Cuál es la duración de tu contrato de arriendo vigente?
                </p>
                <div className="flex flex-wrap gap-2">
                  {RENTAL_CONTRACT_OPTIONS.map((opt) => (
                    <SelectableChip
                      key={opt.value}
                      label={opt.label}
                      selected={entry.rentalContractMonths === opt.value}
                      onClick={() => updateEntry(entry.type, { rentalContractMonths: opt.value })}
                    />
                  ))}
                </div>
              </>
            )}

            {entry.type === "sociedad" && (
              <>
                <p className="mb-2 text-xs" style={{ color: "var(--text-tertiary)" }}>
                  ¿La empresa acredita liquidez o cierres positivos (última declaración SII)?
                </p>
                <div className="flex flex-wrap gap-2">
                  <SelectableChip
                    label="Sí"
                    icon={Check}
                    selected={entry.companyHasLiquidity === true}
                    onClick={() => updateEntry(entry.type, { companyHasLiquidity: true })}
                  />
                  <SelectableChip
                    label="No"
                    icon={X}
                    selected={entry.companyHasLiquidity === false}
                    onClick={() => updateEntry(entry.type, { companyHasLiquidity: false })}
                  />
                </div>
              </>
            )}
          </div>
        );
      })}

      <div>
        <h2
          className="mb-3 text-sm font-semibold uppercase tracking-wide"
          style={{ color: "var(--text-secondary)" }}
        >
          Nivel profesional
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {PROFESSIONAL_LEVEL_OPTIONS.map((opt) => (
            <SelectableCard
              key={opt.value}
              label={opt.label}
              description={opt.description}
              selected={data.professionalLevel === opt.value}
              onClick={() => onChange("professionalLevel", opt.value)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Paso 2: SOLO montos exactos (los perfiles ya se identificaron y
 * calificaron en el Paso 1) más "¿qué buscas?" y estado del inmueble.
 */
function StepFinancialProfile({
  data,
  onChange,
}: {
  data: WizardData;
  onChange: <K extends keyof WizardData>(key: K, value: WizardData[K]) => void;
}) {
  function updateAmount(type: WizardIncomeType, amount: number) {
    onChange(
      "incomeSources",
      data.incomeSources.map((e) => (e.type === type ? { ...e, monthlyAmountCLP: amount } : e))
    );
  }

  return (
    <section className="flex flex-col gap-8">
      <header className="text-center">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Tus finanzas
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--text-tertiary)" }}>
          Confirma el monto exacto de cada ingreso que identificaste.
        </p>
      </header>

      <div className="flex flex-col gap-4">
        {data.incomeSources.map((entry) => {
          const typeLabel = INCOME_TYPE_OPTIONS.find((o) => o.value === entry.type)?.label ?? entry.type;
          return (
            <div key={entry.type}>
              <h2
                className="mb-2 text-sm font-semibold uppercase tracking-wide"
                style={{ color: "var(--text-secondary)" }}
              >
                {typeLabel}
              </h2>
              <div className="max-w-xs">
                <AmountSelect
                  value={entry.monthlyAmountCLP}
                  onChange={(v) => updateAmount(entry.type, v)}
                  options={INCOME_AMOUNT_OPTIONS}
                  placeholder="Monto mensual exacto"
                />
              </div>
            </div>
          );
        })}
      </div>

      <div>
        <h2
          className="mb-3 text-sm font-semibold uppercase tracking-wide"
          style={{ color: "var(--text-secondary)" }}
        >
          ¿Para qué destinarás el inmueble?
        </h2>
        <div className="flex flex-wrap gap-2">
          {PROPERTY_DESTINATION_OPTIONS.map((opt) => (
            <SelectableChip
              key={opt.value}
              label={opt.label}
              selected={data.propertyDestination === opt.value}
              onClick={() => onChange("propertyDestination", opt.value)}
            />
          ))}
        </div>
      </div>

      <div>
        <h2
          className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide"
          style={{ color: "var(--text-secondary)" }}
        >
          <Home size={16} /> Estado del inmueble que buscas
        </h2>
        <div className="flex flex-wrap gap-2">
          {PROPERTY_STATUS_OPTIONS.map((opt) => (
            <SelectableChip
              key={opt.value}
              label={opt.label}
              selected={data.propertyStatus === opt.value}
              onClick={() => onChange("propertyStatus", opt.value)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function StepSavings({
  data,
  onChange,
}: {
  data: WizardData;
  onChange: <K extends keyof WizardData>(key: K, value: WizardData[K]) => void;
}) {
  return (
    <section className="flex flex-col gap-8">
      <header className="text-center">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Último paso
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--text-tertiary)" }}>
          Ahorro disponible y deudas vigentes.
        </p>
      </header>

      <div>
        <h2
          className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide"
          style={{ color: "var(--text-secondary)" }}
        >
          <PiggyBank size={16} /> ¿Cuánto ahorro/pie tienes disponible?
        </h2>
        <div className="max-w-xs">
          <AmountSelect value={data.savingsAmount} onChange={(v) => onChange("savingsAmount", v)} />
        </div>
      </div>

      <div>
        <h2
          className="mb-3 text-sm font-semibold uppercase tracking-wide"
          style={{ color: "var(--text-secondary)" }}
        >
          ¿Tienes deudas vigentes?
        </h2>
        <div className="flex flex-wrap gap-2">
          <SelectableChip
            label="Sí"
            icon={Check}
            selected={data.hasExistingDebt === true}
            onClick={() => onChange("hasExistingDebt", true)}
          />
          <SelectableChip
            label="No"
            icon={X}
            selected={data.hasExistingDebt === false}
            onClick={() => {
              onChange("hasExistingDebt", false);
              onChange("totalDebtBalance", null);
            }}
          />
        </div>
        {data.hasExistingDebt && (
          <div className="mt-3 max-w-xs">
            <h3 className="mb-3 text-sm" style={{ color: "var(--text-tertiary)" }}>
              ¿Cuál es el saldo TOTAL exacto de tus deudas vigentes?
            </h3>
            <AmountSelect value={data.totalDebtBalance} onChange={(v) => onChange("totalDebtBalance", v)} />
          </div>
        )}
      </div>

      <div>
        <h2
          className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide"
          style={{ color: "var(--text-secondary)" }}
        >
          <Users size={16} /> ¿Cuentas con un aval o codeudor?
        </h2>
        <div className="flex flex-wrap gap-2">
          <SelectableChip
            label="Sí"
            icon={Check}
            selected={data.hasAval === true}
            onClick={() => onChange("hasAval", true)}
          />
          <SelectableChip
            label="No"
            icon={X}
            selected={data.hasAval === false}
            onClick={() => {
              onChange("hasAval", false);
              onChange("avalRelationship", null);
              onChange("avalMonthlySalary", null);
              onChange("avalEmploymentType", null);
            }}
          />
        </div>

        {data.hasAval && (
          <div className="mt-6 flex flex-col gap-5">
            <div>
              <h3 className="mb-3 text-sm" style={{ color: "var(--text-tertiary)" }}>
                Parentesco con el aval
              </h3>
              <div className="flex flex-wrap gap-2">
                {AVAL_RELATIONSHIP_OPTIONS.map((opt) => (
                  <SelectableChip
                    key={opt.value}
                    label={opt.label}
                    selected={data.avalRelationship === opt.value}
                    onClick={() => onChange("avalRelationship", opt.value)}
                  />
                ))}
              </div>
            </div>

            <div className="max-w-xs">
              <h3 className="mb-3 text-sm" style={{ color: "var(--text-tertiary)" }}>
                Renta líquida mensual exacta del aval
              </h3>
              <AmountSelect
                value={data.avalMonthlySalary}
                onChange={(v) => onChange("avalMonthlySalary", v)}
                options={INCOME_AMOUNT_OPTIONS}
              />
            </div>

            <div>
              <h3 className="mb-3 text-sm" style={{ color: "var(--text-tertiary)" }}>
                Tipo de contrato del aval
              </h3>
              <div className="flex flex-wrap gap-2">
                {EMPLOYMENT_OPTIONS.map((opt) => (
                  <SelectableChip
                    key={opt.value}
                    label={opt.label}
                    selected={data.avalEmploymentType === opt.value}
                    onClick={() => onChange("avalEmploymentType", opt.value)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
