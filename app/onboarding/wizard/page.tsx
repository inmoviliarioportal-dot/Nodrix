"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Briefcase, PiggyBank, Wallet, Home, Check, X, Users } from "lucide-react";
import { SelectableCard } from "@/components/wizard/SelectableCard";
import { WizardProgress } from "@/components/wizard/WizardProgress";
import { INVESTMENT_TYPE_OPTIONS, PROPERTY_STATUS_OPTIONS } from "@/components/auth/schemas";
import { SALARY_BANDS, SAVINGS_BANDS, DEBT_BANDS, type FinancialBand } from "@/lib/financial-bands";
import {
  WIZARD_INITIAL_DATA,
  clearWizardProgress,
  loadWizardProgress,
  saveWizardProgress,
  type WizardData,
  type WizardEmploymentType,
} from "@/lib/wizard-storage";

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
 * registro (se movió a este wizard como `salaryBandId`, Paso 2), así que
 * `RegisteredProfile` ya no incluye un salario -- se resuelve desde la banda
 * elegida en `handleNext`. */
interface RegisteredProfile {
  name: string;
  email: string;
  phone: string;
  rut: string | null;
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
                  salaryBandId: closestBandId(SALARY_BANDS, customer.monthly_income) ?? prev.salaryBandId,
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
        return data.employmentType !== null && data.employmentYears !== null;
      case 2:
        return (
          data.salaryBandId !== null &&
          data.investmentType !== null &&
          data.propertyStatus !== null
        );
      case 3:
        if (data.savingsBandId === null || data.hasExistingDebt === null) return false;
        if (data.hasExistingDebt && !data.debtBandId) return false;
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
    const salaryRepresentative =
      SALARY_BANDS.find((b) => b.id === data.salaryBandId)?.representative ?? null;
    const savingsRepresentative =
      SAVINGS_BANDS.find((b) => b.id === data.savingsBandId)?.representative ?? null;
    const debtRepresentative = data.hasExistingDebt
      ? (DEBT_BANDS.find((b) => b.id === data.debtBandId)?.representative ?? 0)
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
            monthlySalary: salaryRepresentative,
            savingsAmount: savingsRepresentative,
            hasExistingDebt: data.hasExistingDebt,
            monthlyDebtPayments: debtRepresentative,
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
      monthlySalary: salaryRepresentative,
      savingsAmount: savingsRepresentative,
      employmentType: data.employmentType,
      employmentYears: data.employmentYears,
      hasExistingDebt: data.hasExistingDebt,
      monthlyDebtPayments: debtRepresentative,
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
              onChangeType={(v) => update("employmentType", v)}
              onChangeYears={(v) => update("employmentYears", v)}
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
  onChangeType,
  onChangeYears,
}: {
  employmentType: WizardEmploymentType | null;
  employmentYears: number | null;
  onChangeType: (v: WizardEmploymentType) => void;
  onChangeYears: (v: number) => void;
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
    </section>
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

      <div>
        <h2
          className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide"
          style={{ color: "var(--text-secondary)" }}
        >
          <Wallet size={16} /> ¿Cuál es tu renta líquida mensual?
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {SALARY_BANDS.map((band) => (
            <SelectableCard
              key={band.id}
              label={band.label}
              selected={data.salaryBandId === band.id}
              onClick={() => onChange("salaryBandId", band.id)}
            />
          ))}
        </div>
      </div>

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
              onChange("debtBandId", null);
            }}
          />
        </div>
        {data.hasExistingDebt && (
          <div className="mt-3">
            <h3 className="mb-3 text-sm" style={{ color: "var(--text-tertiary)" }}>
              ¿Cuál es tu pago mensual de deudas?
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {DEBT_BANDS.map((band) => (
                <SelectableCard
                  key={band.id}
                  label={band.label}
                  selected={data.debtBandId === band.id}
                  onClick={() => onChange("debtBandId", band.id)}
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
