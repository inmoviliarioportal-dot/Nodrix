"use client";

import { Check } from "lucide-react";

interface WizardProgressProps {
  step: number; // 1-based, 1..totalSteps
  totalSteps: number;
  /** Labels cortos por paso (ej. "Empleo", "Finanzas", "Ahorro"). Opcional --
   * si no se pasan no se muestran labels bajo cada círculo. */
  labels?: string[];
}

/**
 * Indicador de progreso superior compacto: círculos de 22px numerados (o con
 * check si ya se completaron) conectados por una línea fina, con un label
 * corto debajo de cada uno -- reemplaza la barra de dots + "Paso N de X".
 */
export function WizardProgress({ step, totalSteps, labels }: WizardProgressProps) {
  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1);

  return (
    <div className="mx-auto mb-8 flex w-full max-w-md flex-col items-center gap-2">
      <div className="flex items-center justify-center gap-2">
        {steps.map((n) => {
          const done = n < step;
          const active = n === step;
          const color = done || active ? "var(--neon-cyan)" : "var(--glass-border)";
          return (
            <div key={n} className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span
                  className="flex items-center justify-center rounded-full text-[11px] font-bold transition-all duration-300 ease-out"
                  style={{
                    width: 22,
                    height: 22,
                    borderWidth: 1.5,
                    borderStyle: "solid",
                    borderColor: color,
                    color: done ? "var(--deep)" : active ? "var(--neon-cyan)" : "var(--text-tertiary)",
                    backgroundColor: done ? "var(--neon-cyan)" : "var(--surface)",
                  }}
                >
                  {done ? <Check size={11} strokeWidth={3} /> : n}
                </span>
                {labels?.[n - 1] ? (
                  <span
                    className="font-heading text-[12.5px] font-semibold"
                    style={{ color: done || active ? "var(--text-primary)" : "var(--text-tertiary)" }}
                  >
                    {labels[n - 1]}
                  </span>
                ) : null}
              </div>
              {n < totalSteps && (
                <div
                  className="h-px transition-colors duration-300 ease-out"
                  style={{ width: 24, backgroundColor: done ? "var(--neon-cyan)" : "var(--glass-border)" }}
                />
              )}
            </div>
          );
        })}
      </div>
      <span className="text-[11.5px]" style={{ color: "var(--text-tertiary)" }}>
        Paso {step} de {totalSteps}
      </span>
    </div>
  );
}
