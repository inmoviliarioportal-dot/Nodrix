"use client";

import type { LucideIcon } from "lucide-react";
import { Check } from "lucide-react";

interface SelectableCardProps {
  label: string;
  description?: string;
  icon?: LucideIcon;
  selected: boolean;
  onClick: () => void;
}

/**
 * Tarjeta mediana seleccionable -- reservada para las 2 preguntas de pocas
 * opciones e importantes del wizard (tipo de contrato, nivel profesional).
 * Todo lo demás usa `SelectableChip` (pill compacto) para reducir el ruido
 * visual. `.glass-card` + borde/glow neón cuando está seleccionada, badge de
 * check en la esquina (patrón del mockup) en vez de agrandar el ícono.
 */
export function SelectableCard({
  label,
  description,
  icon: Icon,
  selected,
  onClick,
}: SelectableCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`glass-card group relative flex w-full flex-col items-start gap-1 rounded-2xl p-4 text-left transition-all duration-200 ease-out ${
        selected
          ? "glow-cyan border-[color:var(--neon-cyan)]"
          : "border-transparent hover:border-[color:var(--glass-border)] hover:bg-white/[0.06]"
      }`}
      style={{
        borderWidth: 1,
        borderColor: selected ? "var(--neon-cyan)" : "var(--glass-border)",
        minHeight: 44,
      }}
    >
      {selected && (
        <span
          className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full"
          style={{ backgroundColor: "var(--neon-cyan)" }}
        >
          <Check size={10} strokeWidth={3.5} color="var(--deep)" />
        </span>
      )}
      {Icon ? (
        <Icon
          size={22}
          strokeWidth={1.75}
          className="mb-1 transition-colors duration-200"
          color={selected ? "var(--neon-cyan)" : "var(--text-secondary)"}
        />
      ) : null}
      <span
        className="pr-4 text-[13.5px] font-semibold leading-tight transition-colors duration-200"
        style={{ color: selected ? "var(--neon-cyan)" : "var(--text-primary)" }}
      >
        {label}
      </span>
      {description ? (
        <span className="text-[11px] leading-snug" style={{ color: "var(--text-tertiary)" }}>
          {description}
        </span>
      ) : null}
    </button>
  );
}
