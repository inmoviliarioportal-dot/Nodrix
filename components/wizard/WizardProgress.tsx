"use client";

import { Check } from "lucide-react";

interface WizardProgressProps {
  step: number; // 1-based, 1..totalSteps
  totalSteps: number;
  /** Labels cortos por paso (ej. "Perfil", "Finanzas", "Ahorro"). Opcional --
   * si no se pasan no se muestran labels junto a cada círculo. */
  labels?: string[];
}

/**
 * Stepper horizontal centrado (ver referencias en Rediseño/rediseño/*.png):
 * círculos numerados de 28px -- azul relleno en el paso activo, check
 * verde/azul en los completados, contorno gris en los pendientes -- unidos
 * por una línea sólida entre completados y punteada hacia los pendientes.
 * Subtítulo "Paso N de X" centrado debajo.
 */
export function WizardProgress({ step, totalSteps, labels }: WizardProgressProps) {
  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1);

  return (
    <div className="mx-auto mb-10 flex w-full flex-col items-center gap-2">
      <div className="flex items-center justify-center gap-3 sm:gap-4">
        {steps.map((n) => {
          const done = n < step;
          const active = n === step;
          return (
            <div key={n} className="flex items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-2">
                <span
                  className="flex shrink-0 items-center justify-center rounded-full text-[13px] font-bold transition-all duration-300 ease-out"
                  style={{
                    width: 28,
                    height: 28,
                    borderWidth: 1.75,
                    borderStyle: "solid",
                    borderColor: done || active ? "var(--neon-cyan)" : "var(--glass-border)",
                    color: done ? "#ffffff" : active ? "#ffffff" : "var(--text-tertiary)",
                    backgroundColor: done || active ? "var(--neon-cyan)" : "var(--surface)",
                  }}
                >
                  {done ? <Check size={13} strokeWidth={3} /> : n}
                </span>
                {labels?.[n - 1] ? (
                  <span
                    className="font-heading text-[13.5px] font-semibold"
                    style={{ color: done || active ? "var(--text-primary)" : "var(--text-tertiary)" }}
                  >
                    {labels[n - 1]}
                  </span>
                ) : null}
              </div>
              {n < totalSteps && (
                <div
                  className="h-px w-8 transition-colors duration-300 ease-out sm:w-10"
                  style={{
                    backgroundColor: done ? "var(--neon-cyan)" : "transparent",
                    borderTop: done ? "none" : "1.5px dashed var(--glass-border)",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
      <span className="text-[12.5px]" style={{ color: "var(--text-tertiary)" }}>
        Paso {step} de {totalSteps}
      </span>
    </div>
  );
}
