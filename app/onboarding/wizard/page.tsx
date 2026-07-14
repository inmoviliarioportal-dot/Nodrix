"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { TrendingUp, Home, Briefcase, PiggyBank, Check, X } from "lucide-react";
import { SelectableCard } from "@/components/wizard/SelectableCard";
import { WizardProgress } from "@/components/wizard/WizardProgress";
import {
  WIZARD_INITIAL_DATA,
  clearWizardProgress,
  loadWizardProgress,
  saveWizardProgress,
  type WizardData,
  type WizardEmploymentType,
  type WizardPurpose,
} from "@/lib/wizard-storage";

/** Clave sessionStorage usada para pasar el payload completo del lead a
 * /onboarding/processing (pantalla de AI Processing, otro agente).
 * IMPORTANTE: Coincide con INPUT_KEY esperada por processing/page.tsx. */
export const WIZARD_PAYLOAD_STORAGE_KEY = "wizard-progress";

const TOTAL_STEPS = 4;

const SALARY_TRAMOS: { label: string; description: string; value: number }[] = [
  { label: "Menos de $500.000", description: "CLP mensuales", value: 400_000 },
  { label: "$500.000 - $900.000", description: "CLP mensuales", value: 700_000 },
  { label: "$900.000 - $1.500.000", description: "CLP mensuales", value: 1_200_000 },
  { label: "$1.500.000 - $2.500.000", description: "CLP mensuales", value: 2_000_000 },
  { label: "Más de $2.500.000", description: "CLP mensuales", value: 3_000_000 },
];

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

function isValidEmail(email: string): boolean {
  return /\S+@\S+\.\S+/.test(email);
}

export default function WizardPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>(WIZARD_INITIAL_DATA);
  const [transitioning, setTransitioning] = useState(false);
  const [contactErrors, setContactErrors] = useState<Record<string, string>>({});
  const hasRestored = useRef(false);

  // Restaurar progreso guardado en localStorage al montar.
  useEffect(() => {
    const saved = loadWizardProgress();
    if (saved) {
      setStep(saved.step);
      setData(saved.data);
    }
    // Best-effort: si el usuario ya está logueado, precargar name/email desde
    // GET /api/auth/user para no volver a pedirlos. Si falla o no hay sesión,
    // el paso de contacto simplemente se muestra vacío (flujo sin login).
    fetch("/api/auth/user")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!json?.customer && !json?.user) return;
        setData((prev) => {
          if (prev.name || prev.email) return prev; // no pisar progreso ya guardado
          return {
            ...prev,
            name: json.customer?.name ?? prev.name,
            email: json.user?.email ?? json.customer?.email ?? prev.email,
            phone: json.customer?.phone ?? prev.phone,
          };
        });
      })
      .catch(() => {
        // Sin sesión o API no disponible: seguir con el flujo manual.
      })
      .finally(() => {
        hasRestored.current = true;
      });
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

  function validateContact(): boolean {
    const errors: Record<string, string> = {};
    if (!data.name.trim()) errors.name = "Ingresa tu nombre completo";
    if (!isValidEmail(data.email)) errors.email = "Ingresa un correo válido";
    if (!data.phone.trim()) errors.phone = "Ingresa tu teléfono";
    setContactErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function canAdvance(): boolean {
    switch (step) {
      case 1:
        return data.purpose !== null;
      case 2:
        return data.monthlySalary !== null;
      case 3:
        return data.employmentType !== null && data.employmentYears !== null;
      case 4:
        if (data.savingsAmount === null || data.hasExistingDebt === null) return false;
        if (data.hasExistingDebt && !data.monthlyDebtPayments) return false;
        return validateContact();
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

    // Paso final: arma el payload EXACTO del contrato de POST /api/leads y lo
    // pasa a la pantalla de AI Processing vía sessionStorage. Este componente
    // NO llama a /api/leads directamente — eso lo hace /onboarding/processing.
    const payload = {
      name: data.name.trim(),
      email: data.email.trim(),
      phone: data.phone.trim(),
      monthlySalary: data.monthlySalary,
      savingsAmount: data.savingsAmount,
      employmentType: data.employmentType,
      employmentYears: data.employmentYears,
      hasExistingDebt: data.hasExistingDebt,
      monthlyDebtPayments: data.hasExistingDebt ? data.monthlyDebtPayments ?? 0 : 0,
      purpose: data.purpose,
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

        <div
          className="transition-opacity duration-150 ease-out"
          style={{ opacity: transitioning ? 0 : 1 }}
        >
          {step === 1 && (
            <StepPurpose
              value={data.purpose}
              onChange={(v) => update("purpose", v)}
            />
          )}
          {step === 2 && (
            <StepSalary
              value={data.monthlySalary}
              onChange={(v) => update("monthlySalary", v)}
            />
          )}
          {step === 3 && (
            <StepEmployment
              employmentType={data.employmentType}
              employmentYears={data.employmentYears}
              onChangeType={(v) => update("employmentType", v)}
              onChangeYears={(v) => update("employmentYears", v)}
            />
          )}
          {step === 4 && (
            <StepSavingsAndContact
              data={data}
              errors={contactErrors}
              onChange={update}
            />
          )}
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

function StepPurpose({
  value,
  onChange,
}: {
  value: WizardPurpose | null;
  onChange: (v: WizardPurpose) => void;
}) {
  return (
    <section className="flex flex-col gap-6">
      <header className="text-center">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          ¿Cuál es tu propósito?
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--text-tertiary)" }}>
          Esto nos ayuda a personalizar tu perfil de inversión.
        </p>
      </header>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectableCard
          label="Inversión"
          description="Busco rentabilidad y plusvalía"
          icon={TrendingUp}
          selected={value === "INVERSION"}
          onClick={() => onChange("INVERSION")}
        />
        <SelectableCard
          label="Vivir"
          description="Busco mi próximo hogar"
          icon={Home}
          selected={value === "VIVIR"}
          onClick={() => onChange("VIVIR")}
        />
      </div>
    </section>
  );
}

function StepSalary({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number) => void;
}) {
  return (
    <section className="flex flex-col gap-6">
      <header className="text-center">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          ¿Cuál es tu renta mensual líquida?
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--text-tertiary)" }}>
          Selecciona el tramo que más se acerque a tu ingreso.
        </p>
      </header>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {SALARY_TRAMOS.map((tramo) => (
          <SelectableCard
            key={tramo.value}
            label={tramo.label}
            description={tramo.description}
            selected={value === tramo.value}
            onClick={() => onChange(tramo.value)}
          />
        ))}
      </div>
    </section>
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

function StepSavingsAndContact({
  data,
  errors,
  onChange,
}: {
  data: WizardData;
  errors: Record<string, string>;
  onChange: <K extends keyof WizardData>(key: K, value: WizardData[K]) => void;
}) {
  return (
    <section className="flex flex-col gap-8">
      <header className="text-center">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Último paso
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--text-tertiary)" }}>
          Ahorro disponible, deudas y tus datos de contacto.
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

      <div className="glass-card flex flex-col gap-4 rounded-2xl p-5">
        <h2
          className="text-sm font-semibold uppercase tracking-wide"
          style={{ color: "var(--text-secondary)" }}
        >
          Tus datos de contacto
        </h2>
        <ContactField
          label="Nombre completo"
          value={data.name}
          error={errors.name}
          onChange={(v) => onChange("name", v)}
        />
        <ContactField
          label="Correo electrónico"
          type="email"
          value={data.email}
          error={errors.email}
          onChange={(v) => onChange("email", v)}
        />
        <ContactField
          label="Teléfono"
          type="tel"
          value={data.phone}
          error={errors.phone}
          onChange={(v) => onChange("phone", v)}
        />
      </div>
    </section>
  );
}

function ContactField({
  label,
  value,
  onChange,
  error,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium" style={{ color: "var(--text-tertiary)" }}>
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border bg-transparent px-4 py-2.5 outline-none transition-colors duration-200"
        style={{
          borderColor: error ? "var(--status-error, #EF4444)" : "var(--glass-border)",
          color: "var(--text-primary)",
          backgroundColor: "var(--surface-elevated)",
        }}
      />
      {error ? (
        <span className="text-xs" style={{ color: "#EF4444" }}>
          {error}
        </span>
      ) : null}
    </label>
  );
}
