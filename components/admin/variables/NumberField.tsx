"use client"

import * as React from "react"
import { HelpTooltip } from "@/components/admin/variables/HelpTooltip"
import { cn } from "@/lib/utils"

/**
 * Campo numérico con etiqueta + "?" de ayuda -- pieza base de los 4
 * editores de grupo (qualification/bankingParams/probabilities/
 * assumptions), reemplazando el textarea JSON crudo por un campo que
 * cualquiera pueda editar sin saber qué es una llave JSON.
 *
 * `asPercent`: el valor se guarda internamente como fracción 0-1 (igual
 * que el JSON real, ej. `maxRatio: 0.4`), pero se muestra y edita como
 * porcentaje 0-100 (`40`) -- la conversión es transparente para quien usa
 * el campo.
 */
export function NumberField({
  label,
  help,
  value,
  onChange,
  suffix,
  asPercent,
  min,
  max,
  step,
  invalid,
  className,
}: {
  label: string
  help?: { what: string; example: string; impact: string }
  value: number
  onChange: (value: number) => void
  suffix?: string
  asPercent?: boolean
  min?: number
  max?: number
  step?: number
  invalid?: boolean
  className?: string
}) {
  const displayValue = asPercent ? value * 100 : value

  function handleChange(raw: string) {
    const parsed = Number(raw)
    if (!Number.isFinite(parsed)) return
    onChange(asPercent ? parsed / 100 : parsed)
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-center gap-1.5">
        <label className="text-xs font-medium text-text-secondary">{label}</label>
        {help && <HelpTooltip {...help} />}
      </div>
      <div className="relative">
        <input
          type="number"
          value={Number.isFinite(displayValue) ? displayValue : ""}
          onChange={(e) => handleChange(e.target.value)}
          min={min}
          max={max}
          step={step ?? (asPercent ? 0.1 : 1)}
          className={cn(
            "w-full rounded-md border bg-surface-elevated px-3 py-2 text-sm text-text-primary",
            invalid ? "border-status-error" : "border-glass-border"
          )}
        />
        {(suffix || asPercent) && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-tertiary">
            {asPercent ? "%" : suffix}
          </span>
        )}
      </div>
    </div>
  )
}
