"use client";

interface WizardProgressProps {
  step: number; // 1-based, 1..totalSteps
  totalSteps: number;
}

/** Indicador de progreso superior del Wizard: dots + texto "N de 4". */
export function WizardProgress({ step, totalSteps }: WizardProgressProps) {
  return (
    <div className="mx-auto mb-10 flex w-full max-w-md flex-col items-center gap-3">
      <div className="flex items-center gap-2">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((n) => (
          <div
            key={n}
            className="h-1.5 rounded-full transition-all duration-300 ease-out"
            style={{
              width: n === step ? 32 : 16,
              backgroundColor:
                n <= step ? "var(--neon-cyan)" : "var(--glass-border)",
              boxShadow: n === step ? "0 0 12px var(--neon-cyan-glow)" : "none",
            }}
          />
        ))}
      </div>
      <span
        className="text-sm font-medium tracking-wide"
        style={{ color: "var(--text-tertiary)" }}
      >
        Paso {step} de {totalSteps}
      </span>
    </div>
  );
}
