"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, PiggyBank, Check, X } from "lucide-react";
import { SelectableCard } from "@/components/wizard/SelectableCard";
import { WizardProgress } from "@/components/wizard/WizardProgress";
import {
  WIZARD_INITIAL_DATA,
  clearWizardProgress,
  loadWizardProgress,
  saveWizardProgress,
  type WizardData,
  type WizardEmploymentType,
} from "@/lib/wizard-storage";

/** Clave sessionStorage usada para pasar el payload completo del lead a
 * /onboarding/processing (pantalla de AI Processing, otro agente).
 * IMPORTANTE: Coincide con INPUT_KEY esperada por processing/page.tsx. */
export const WIZARD_PAYLOAD_STORAGE_KEY = "wizard-progress";

const TOTAL_STEPS = 2;

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

/** Datos del cliente ya recolectados en el registro extendido -- el wizard
 * NO vuelve a pedirlos, solo los reutiliza para armar el payload final de
 * POST /api/leads. Ver app/auth/register/page.tsx / migración 004. */
interface RegisteredProfile {
  name: string;
  email: string;
  phone: string;
  rut: string | null;
  monthlySalary: number | null;
}

export default function WizardPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>(WIZARD_INITIAL_DATA);
  const [transitioning, setTransitioning] = useState(false);
  const [profile, setProfile] = useState<RegisteredProfile | null>(null);
  const [profileError, setProfileError] = useState(false);
  const hasRestored = useRef(false);

  // Restaurar progreso guardado en localStorage al montar.
  useEffect(() => {
    const saved = loadWizardProgress();
    if (saved) {
      setStep(saved.step);
      setData(saved.data);
    }
    hasRestored.current = true;

    // El wizard ya no pide nombre/email/teléfono/renta -- vienen del
    // registro extendido. Si por alguna razón no hay sesión (o falta el
    // registro extendido), avisamos en vez de enviar un lead incompleto.
    fetch("/api/auth/user")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
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
          monthlySalary: customer?.monthly_income ?? null,
        });
      })
      .catch(() => setProfileError(true));
  }, []);

  // Autosave cada vez que cambian los datos o el paso (tras la restauración inicial).
  useEffect(() => {
    if (!hasRestored.current) return;
    saveWizardProgress(step, data);
  }, [step, data]);

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
        if (data.savingsAmount === null || data.hasExistingDebt === null) return false;
        if (data.hasExistingDebt && !data.monthlyDebtPayments) return false;
        return true;
      default:
        return false;
    }
  }

  function handleNext() {
    if (!canAdvance()) return;

    if (step < TOTAL_STEPS) {
      goToStep(step + 1);
      return;
    }

    if (!profile || !profile.name || !profile.email) {
      setProfileError(true);
      return;
    }

    // Paso final: arma el payload EXACTO del contrato de POST /api/leads y lo
    // pasa a la pantalla de AI Processing vía sessionStorage. Este componente
    // NO llama a /api/leads directamente — eso lo hace /onboarding/processing.
    // name/email/phone/rut/monthlySalary vienen del registro (no se piden de
    // nuevo acá); solo employmentType/employmentYears/savings/deuda son datos
    // nuevos recolectados en este wizard.
    const payload = {
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      rut: profile.rut,
      monthlySalary: profile.monthlySalary,
      savingsAmount: data.savingsAmount,
      employmentType: data.employmentType,
      employmentYears: data.employmentYears,
      hasExistingDebt: data.hasExistingDebt,
      monthlyDebtPayments: data.hasExistingDebt ? data.monthlyDebtPayments ?? 0 : 0,
    };

    try {
      window.sessionStorage.setItem(WIZARD_PAYLOAD_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // sessionStorage no disponible: seguimos igual, la pantalla siguiente
      // deberá manejar el caso "sin payload" (best effort, no crítico aquí).
    }

    clearWizardProgress();
    router.push("/onboarding/processing");
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
          {step === 2 && <StepSavings data={data} onChange={update} />}
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
            disabled={!canAdvance()}
            className="glow-purple rounded-xl px-8 py-3 text-sm font-semibold transition-all duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-30"
            style={{
              backgroundColor: "var(--neon-purple)",
              color: "var(--deep)",
            }}
          >
            {step === TOTAL_STEPS ? "Finalizar" : "Siguiente"}
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
          <PiggyBank size={16} /> Ahorro / pie disponible (CLP)
        </h2>
        <input
          type="number"
          min={0}
          inputMode="numeric"
          placeholder="Ej: 12000000"
          value={data.savingsAmount ?? ""}
          onChange={(e) =>
            onChange("savingsAmount", e.target.value === "" ? null : Number(e.target.value))
          }
          className="w-full rounded-xl border bg-transparent px-4 py-3 text-lg outline-none transition-colors duration-200"
          style={{
            borderColor: "var(--glass-border)",
            color: "var(--text-primary)",
            backgroundColor: "var(--surface-elevated)",
          }}
        />
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
              onChange("monthlyDebtPayments", 0);
            }}
          />
        </div>
        {data.hasExistingDebt && (
          <input
            type="number"
            min={0}
            inputMode="numeric"
            placeholder="Monto de deuda mensual (CLP)"
            value={data.monthlyDebtPayments ?? ""}
            onChange={(e) =>
              onChange(
                "monthlyDebtPayments",
                e.target.value === "" ? null : Number(e.target.value)
              )
            }
            className="mt-3 w-full rounded-xl border bg-transparent px-4 py-3 text-lg outline-none transition-colors duration-200"
            style={{
              borderColor: "var(--glass-border)",
              color: "var(--text-primary)",
              backgroundColor: "var(--surface-elevated)",
            }}
          />
        )}
      </div>
    </section>
  );
}
