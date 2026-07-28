"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Briefcase, PiggyBank, Wallet, Home, Check, X, Users } from "lucide-react";
import { SelectableCard } from "@/components/wizard/SelectableCard";
import { WizardProgress } from "@/components/wizard/WizardProgress";
import { INVESTMENT_TYPE_OPTIONS, PROPERTY_STATUS_OPTIONS } from "@/components/auth/schemas";
import { SALARY_BANDS, SAVINGS_BANDS, DEBT_BALANCE_BANDS, type FinancialBand } from "@/lib/financial-bands";
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
} from "@/lib/wizard-storage";
import type { IncomeSource } from "@/lib/income-types";

/** Los 5 tipos de ingreso que evalúa la banca -- ver lib/income-types.ts. */
const INCOME_TYPE_OPTIONS: { label: string; value: WizardIncomeType }[] = [
  { label: "Sueldo fijo (recibo de sueldo)", value: "sueldo_fijo" },
  { label: "Boleta de honorarios", value: "boleta" },
  { label: "Jubilación / Pensión", value: "pension" },
  { label: "Alquiler de propiedades", value: "alquiler" },
  { label: "Sociedad / Compañía (dividendos)", value: "sociedad" },
];

/** Tope cualitativo sobre la probabilidad de aprobación -- ver lib/proposal-risk.ts. */
const PROFESSIONAL_LEVEL_OPTIONS: { label: string; description: string; value: WizardProfessionalLevel }[] = [
  { label: "Profesional / Ingeniero", description: "Título profesional universitario", value: "profesional" },
  { label: "Técnico", description: "Título técnico o sin título", value: "tecnico" },
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

/** Encuentra la banda cuyo `representative` está más cerca de un valor CLP
 * dado -- usado para precargar el wizard en modo edición a partir de valores
 * numéricos ya guardados en `customers`/`applications` (no hace falta
 * exactitud perfecta, solo la mejor aproximación disponible). */
function closestBandId(bands: FinancialBand[], value: number | null | undefined): string | null {
  if (typeof value !== "number") return null;
  let best: FinancialBand | null = null;
  let bestDiff = Infinity;
  for (const band of bands) {
    const diff = Math.abs(band.representative - value);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = band;
    }
  }
  return best?.id ?? null;
}

/**
 * Reconstruye las fuentes de ingreso del wizard (modo edición) a partir del
 * `income_sources` crudo persistido en la application (ver migración
 * 021_application_income_sources.sql). Si la application es de antes de
 * este cambio (columna null) hace un mejor esfuerzo con un solo sueldo fijo
 * a partir de `customers.monthly_income`, que es lo único que existía antes.
 */
function prefillIncomeSources(
  rawIncomeSources: unknown,
  monthlyIncome: number | null | undefined
): WizardIncomeSourceEntry[] | null {
  if (Array.isArray(rawIncomeSources) && rawIncomeSources.length > 0) {
    return rawIncomeSources.map((raw) => {
      const r = raw as Partial<IncomeSource> & Record<string, unknown>;
      const entry = emptyIncomeSourceEntry((r.type as WizardIncomeType) ?? "sueldo_fijo");
      entry.amountBandId = closestBandId(SALARY_BANDS, r.monthlyAmountCLP as number);
      entry.hasSignificantBonusIncome = (r.hasSignificantBonusIncome as boolean) ?? null;
      entry.isVariableBoleta = (r.isVariableBoleta as boolean) ?? null;
      entry.rentalContractMonths = (r.rentalContractMonths as number) ?? null;
      entry.companyHasLiquidity = (r.companyHasLiquidity as boolean) ?? null;
      return entry;
    });
  }
  if (typeof monthlyIncome === "number") {
    const entry = emptyIncomeSourceEntry("sueldo_fijo");
    entry.amountBandId = closestBandId(SALARY_BANDS, monthlyIncome);
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
          // de fallback que app/onboarding/initial-proposal/page.tsx) y
          // mapea sus valores numéricos a la banda más cercana.
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
                  propertyStatus: customer.property_status ?? prev.propertyStatus,
                  savingsBandId: closestBandId(SAVINGS_BANDS, app.savings_amount) ?? prev.savingsBandId,
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
      case 1:
        return (
          data.employmentType !== null &&
          data.employmentYears !== null &&
          data.professionalLevel !== null
        );
      case 2: {
        if (data.incomeSources.length === 0) return false;
        if (data.investmentType === null || data.propertyStatus === null) return false;
        return data.incomeSources.every((entry) => {
          if (!entry.amountBandId) return false;
          if (entry.type === "sueldo_fijo") return entry.hasSignificantBonusIncome !== null;
          if (entry.type === "boleta") return entry.isVariableBoleta !== null;
          if (entry.type === "alquiler") return entry.rentalContractMonths !== null;
          if (entry.type === "sociedad") return entry.companyHasLiquidity !== null;
          return true; // pension: no requiere campo extra (usa la edad ya registrada)
        });
      }
      case 3:
        if (data.savingsBandId === null || data.hasExistingDebt === null) return false;
        if (data.hasExistingDebt && !data.totalDebtBalanceBandId) return false;
        if (data.hasAval === null) return false;
        if (data.hasAval && (!data.avalRelationship || !data.avalSalaryBandId || !data.avalEmploymentType)) {
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

    // Resuelve los valores representativos de las bandas elegidas -- el
    // cliente eligió un rango, no tipeó un número, pero el motor de scoring
    // (lib/scoring.ts) y el endpoint de actualización siguen esperando
    // números (ver lib/financial-bands.ts).
    // Cada fuente de ingreso declarada (mixto) se resuelve a un IncomeSource
    // real -- ver lib/income-types.ts. La edad para pensión viene del
    // registro (profile.age), no se vuelve a preguntar.
    const incomeSources: IncomeSource[] = data.incomeSources.map((entry) => {
      const amount = SALARY_BANDS.find((b) => b.id === entry.amountBandId)?.representative ?? 0;
      const source: IncomeSource = { type: entry.type, monthlyAmountCLP: amount };
      if (entry.type === "sueldo_fijo") source.hasSignificantBonusIncome = entry.hasSignificantBonusIncome ?? false;
      if (entry.type === "boleta") source.isVariableBoleta = entry.isVariableBoleta ?? false;
      if (entry.type === "pension") source.ageYears = profile?.age ?? undefined;
      if (entry.type === "alquiler") source.rentalContractMonths = entry.rentalContractMonths ?? 0;
      if (entry.type === "sociedad") source.companyHasLiquidity = entry.companyHasLiquidity ?? false;
      return source;
    });
    const savingsRepresentative =
      SAVINGS_BANDS.find((b) => b.id === data.savingsBandId)?.representative ?? null;
    const debtRepresentative = data.hasExistingDebt
      ? (DEBT_BALANCE_BANDS.find((b) => b.id === data.totalDebtBalanceBandId)?.representative ?? 0)
      : 0;
    const avalSalaryRepresentative = data.hasAval
      ? (SALARY_BANDS.find((b) => b.id === data.avalSalaryBandId)?.representative ?? null)
      : null;

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
            employmentType: data.employmentType,
            employmentYears: data.employmentYears,
            professionalLevel: data.professionalLevel,
            incomeSources,
            savingsAmount: savingsRepresentative,
            hasExistingDebt: data.hasExistingDebt,
            totalDebtBalance: debtRepresentative,
            investmentType: data.investmentType,
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
      employmentType: data.employmentType,
      employmentYears: data.employmentYears,
      professionalLevel: data.professionalLevel,
      hasExistingDebt: data.hasExistingDebt,
      totalDebtBalance: debtRepresentative,
      investmentType: data.investmentType,
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
        <WizardProgress step={step} totalSteps={TOTAL_STEPS} />

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
          {step === 1 && (
            <StepEmployment
              employmentType={data.employmentType}
              employmentYears={data.employmentYears}
              professionalLevel={data.professionalLevel}
              onChangeType={(v) => update("employmentType", v)}
              onChangeYears={(v) => update("employmentYears", v)}
              onChangeProfessionalLevel={(v) => update("professionalLevel", v)}
            />
          )}
          {step === 2 && <StepFinancialProfile data={data} onChange={update} />}
          {step === 3 && <StepSavings data={data} onChange={update} />}
        </div>

        <div className="mt-10 flex items-center justify-between gap-4">
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

function StepEmployment({
  employmentType,
  employmentYears,
  professionalLevel,
  onChangeType,
  onChangeYears,
  onChangeProfessionalLevel,
}: {
  employmentType: WizardEmploymentType | null;
  employmentYears: number | null;
  professionalLevel: WizardProfessionalLevel | null;
  onChangeType: (v: WizardEmploymentType) => void;
  onChangeYears: (v: number) => void;
  onChangeProfessionalLevel: (v: WizardProfessionalLevel) => void;
}) {
  return (
    <section className="flex flex-col gap-8">
      <header className="text-center">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Cuéntanos sobre tu empleo
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--text-tertiary)" }}>
          Tipo de contrato y antigüedad laboral.
        </p>
      </header>

      <div>
        <h2
          className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide"
          style={{ color: "var(--text-secondary)" }}
        >
          <Briefcase size={16} /> Tipo de contrato
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {EMPLOYMENT_OPTIONS.map((opt) => (
            <SelectableCard
              key={opt.value}
              label={opt.label}
              description={opt.description}
              selected={employmentType === opt.value}
              onClick={() => onChangeType(opt.value)}
            />
          ))}
        </div>
      </div>

      <div>
        <h2
          className="mb-3 text-sm font-semibold uppercase tracking-wide"
          style={{ color: "var(--text-secondary)" }}
        >
          Antigüedad laboral
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {YEARS_OPTIONS.map((opt) => (
            <SelectableCard
              key={opt.value}
              label={opt.label}
              selected={employmentYears === opt.value}
              onClick={() => onChangeYears(opt.value)}
            />
          ))}
        </div>
      </div>

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
              selected={professionalLevel === opt.value}
              onClick={() => onChangeProfessionalLevel(opt.value)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Selección de tipo(s) de ingreso (mixto -- se puede elegir más de uno) más
 * las preguntas específicas de cada tipo (ver lib/income-types.ts para el
 * detalle de negocio de cada haircut). Reemplaza la antigua pregunta única
 * "¿cuál es tu renta líquida mensual?".
 */
function IncomeSourcesSection({
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
    <div className="flex flex-col gap-6">
      <div>
        <h2
          className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide"
          style={{ color: "var(--text-secondary)" }}
        >
          <Wallet size={16} /> ¿Cuáles son tus fuentes de ingreso?
        </h2>
        <p className="mb-3 text-xs" style={{ color: "var(--text-tertiary)" }}>
          Puedes elegir más de una si tienes ingresos mixtos.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {INCOME_TYPE_OPTIONS.map((opt) => (
            <SelectableCard
              key={opt.value}
              label={opt.label}
              selected={data.incomeSources.some((e) => e.type === opt.value)}
              onClick={() => toggleType(opt.value)}
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

            <p className="mb-2 text-xs" style={{ color: "var(--text-tertiary)" }}>
              ¿Cuál es el monto mensual de este ingreso?
            </p>
            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {SALARY_BANDS.map((band) => (
                <SelectableCard
                  key={band.id}
                  label={band.label}
                  selected={entry.amountBandId === band.id}
                  onClick={() => updateEntry(entry.type, { amountBandId: band.id })}
                />
              ))}
            </div>

            {entry.type === "sueldo_fijo" && (
              <>
                <p className="mb-2 text-xs" style={{ color: "var(--text-tertiary)" }}>
                  ¿La mayor parte de este ingreso viene de bonos (y no de tu sueldo base)?
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <SelectableCard
                    label="Sí"
                    icon={Check}
                    selected={entry.hasSignificantBonusIncome === true}
                    onClick={() => updateEntry(entry.type, { hasSignificantBonusIncome: true })}
                  />
                  <SelectableCard
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
                <div className="grid grid-cols-2 gap-2">
                  <SelectableCard
                    label="Sí, varía"
                    icon={Check}
                    selected={entry.isVariableBoleta === true}
                    onClick={() => updateEntry(entry.type, { isVariableBoleta: true })}
                  />
                  <SelectableCard
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
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {RENTAL_CONTRACT_OPTIONS.map((opt) => (
                    <SelectableCard
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
                <div className="grid grid-cols-2 gap-2">
                  <SelectableCard
                    label="Sí"
                    icon={Check}
                    selected={entry.companyHasLiquidity === true}
                    onClick={() => updateEntry(entry.type, { companyHasLiquidity: true })}
                  />
                  <SelectableCard
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
    </div>
  );
}

function StepFinancialProfile({
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
          Tu perfil financiero
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--text-tertiary)" }}>
          Elige el rango que más se acerque a tu situación.
        </p>
      </header>

      <IncomeSourcesSection data={data} onChange={onChange} />

      <div>
        <h2
          className="mb-3 text-sm font-semibold uppercase tracking-wide"
          style={{ color: "var(--text-secondary)" }}
        >
          ¿Qué buscas?
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {INVESTMENT_TYPE_OPTIONS.map((opt) => (
            <SelectableCard
              key={opt.value}
              label={opt.label}
              selected={data.investmentType === opt.value}
              onClick={() => onChange("investmentType", opt.value)}
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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {PROPERTY_STATUS_OPTIONS.map((opt) => (
            <SelectableCard
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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {SAVINGS_BANDS.map((band) => (
            <SelectableCard
              key={band.id}
              label={band.label}
              selected={data.savingsBandId === band.id}
              onClick={() => onChange("savingsBandId", band.id)}
            />
          ))}
        </div>
      </div>

      <div>
        <h2
          className="mb-3 text-sm font-semibold uppercase tracking-wide"
          style={{ color: "var(--text-secondary)" }}
        >
          ¿Tienes deudas vigentes?
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <SelectableCard
            label="Sí"
            icon={Check}
            selected={data.hasExistingDebt === true}
            onClick={() => onChange("hasExistingDebt", true)}
          />
          <SelectableCard
            label="No"
            icon={X}
            selected={data.hasExistingDebt === false}
            onClick={() => {
              onChange("hasExistingDebt", false);
              onChange("totalDebtBalanceBandId", null);
            }}
          />
        </div>
        {data.hasExistingDebt && (
          <div className="mt-3">
            <h3 className="mb-3 text-sm" style={{ color: "var(--text-tertiary)" }}>
              ¿Cuál es el saldo TOTAL de tus deudas vigentes?
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {DEBT_BALANCE_BANDS.map((band) => (
                <SelectableCard
                  key={band.id}
                  label={band.label}
                  selected={data.totalDebtBalanceBandId === band.id}
                  onClick={() => onChange("totalDebtBalanceBandId", band.id)}
                />
              ))}
            </div>
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
        <div className="grid grid-cols-2 gap-3">
          <SelectableCard
            label="Sí"
            icon={Check}
            selected={data.hasAval === true}
            onClick={() => onChange("hasAval", true)}
          />
          <SelectableCard
            label="No"
            icon={X}
            selected={data.hasAval === false}
            onClick={() => {
              onChange("hasAval", false);
              onChange("avalRelationship", null);
              onChange("avalSalaryBandId", null);
              onChange("avalEmploymentType", null);
            }}
          />
        </div>

        {data.hasAval && (
          <div className="mt-6 flex flex-col gap-6">
            <div>
              <h3 className="mb-3 text-sm" style={{ color: "var(--text-tertiary)" }}>
                Parentesco con el aval
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {AVAL_RELATIONSHIP_OPTIONS.map((opt) => (
                  <SelectableCard
                    key={opt.value}
                    label={opt.label}
                    selected={data.avalRelationship === opt.value}
                    onClick={() => onChange("avalRelationship", opt.value)}
                  />
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm" style={{ color: "var(--text-tertiary)" }}>
                Renta líquida mensual del aval
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {SALARY_BANDS.map((band) => (
                  <SelectableCard
                    key={band.id}
                    label={band.label}
                    selected={data.avalSalaryBandId === band.id}
                    onClick={() => onChange("avalSalaryBandId", band.id)}
                  />
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm" style={{ color: "var(--text-tertiary)" }}>
                Tipo de contrato del aval
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {EMPLOYMENT_OPTIONS.map((opt) => (
                  <SelectableCard
                    key={opt.value}
                    label={opt.label}
                    description={opt.description}
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
