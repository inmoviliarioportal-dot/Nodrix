"use client";

import type { LucideIcon } from "lucide-react";

interface SelectableCardProps {
  label: string;
  description?: string;
  icon?: LucideIcon;
  selected: boolean;
  onClick: () => void;
}

/**
 * Tarjeta seleccionable genérica del Wizard: `.glass-card` + borde/glow neón
 * cuando está seleccionada, hover sutil cuando no. Usada para propósito,
 * tramos de renta y tipo de contrato.
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
      className={`glass-card group flex w-full flex-col items-center gap-3 rounded-2xl p-6 text-center transition-all duration-200 ease-out ${
        selected
          ? "glow-cyan border-[color:var(--neon-cyan)]"
          : "border-transparent hover:border-[color:var(--glass-border)] hover:bg-white/[0.06]"
      }`}
      style={{
        borderWidth: 1,
        borderColor: selected ? "var(--neon-cyan)" : "var(--glass-border)",
      }}
    >
      {Icon ? (
        <Icon
          size={32}
          strokeWidth={1.75}
          className="transition-colors duration-200"
          color={selected ? "var(--neon-cyan)" : "var(--text-secondary)"}
        />
      ) : null}
      <span
        className="text-lg font-semibold transition-colors duration-200"
        style={{ color: selected ? "var(--neon-cyan)" : "var(--text-primary)" }}
      >
        {label}
      </span>
      {description ? (
        <span className="text-sm" style={{ color: "var(--text-tertiary)" }}>
          {description}
        </span>
      ) : null}
    </button>
  );
}
