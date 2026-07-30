"use client";

import type { LucideIcon } from "lucide-react";
import { Check } from "lucide-react";

interface SelectableChipProps {
  label: string;
  icon?: LucideIcon;
  selected: boolean;
  onClick: () => void;
  /** Muestra un check dentro del pill cuando está seleccionado (multi-select,
   * ej. tipos de ingreso mixto). Para selección única (radio-like) no hace
   * falta -- el color ya indica el estado. */
  showCheckWhenSelected?: boolean;
}

/**
 * Chip/pill compacto para opciones de baja densidad de decisión (antigüedad
 * laboral, montos por banda, sí/no, parentesco del aval, etc.) -- reemplaza
 * las tarjetas grandes para reducir ruido visual cuando hay muchas opciones
 * por pregunta. Mantiene altura táctil >=44px vía padding vertical, aunque
 * el texto sea pequeño (~12.5px), y usa los mismos tokens neón del proyecto.
 */
export function SelectableChip({
  label,
  icon: Icon,
  selected,
  onClick,
  showCheckWhenSelected = false,
}: SelectableChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3.5 py-2.5 text-center text-[12.5px] font-semibold transition-all duration-200 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: selected ? "var(--neon-cyan)" : "var(--glass-border)",
        backgroundColor: selected ? "rgba(22,50,79,0.08)" : "var(--surface)",
        color: selected ? "var(--neon-cyan)" : "var(--text-secondary)",
        outlineColor: "var(--neon-cyan)",
      }}
    >
      {Icon ? <Icon size={14} strokeWidth={2} /> : null}
      {showCheckWhenSelected && selected ? <Check size={12} strokeWidth={3} /> : null}
      {label}
    </button>
  );
}
