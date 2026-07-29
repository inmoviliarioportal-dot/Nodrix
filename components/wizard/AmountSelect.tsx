"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"

import { AMOUNT_OPTIONS, formatAmountCLP } from "@/lib/amount-options"

/**
 * Desplegable nativo de monto EXACTO en CLP -- reemplaza la selección por
 * rango/banda (ver lib/financial-bands.ts) para renta, ahorro, deuda y
 * renta del aval: el cliente elige el monto exacto en vez de estimar un
 * rango, lo que hace la pre-evaluación en UF más precisa
 * (lib/uf-preevaluation.ts).
 */
function AmountSelect({
  value,
  onChange,
  placeholder = "Selecciona un monto",
  options = AMOUNT_OPTIONS,
}: {
  value: number | null
  onChange: (value: number) => void
  placeholder?: string
  /** Lista de montos a mostrar -- por defecto el rango completo (hasta $30M).
   * Pasar `INCOME_AMOUNT_OPTIONS` (lib/amount-options.ts) para montos de
   * ingreso, topados en $8M. */
  options?: number[]
}) {
  return (
    <div className="relative">
      <select
        value={value ?? ""}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-11 w-full appearance-none rounded-lg border border-glass-border bg-deep pl-3 pr-9 text-sm text-text-primary outline-none transition-colors duration-200 focus-visible:border-neon-cyan"
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((amount) => (
          <option key={amount} value={amount}>
            {formatAmountCLP(amount)}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-text-tertiary" />
    </div>
  )
}

export { AmountSelect }
