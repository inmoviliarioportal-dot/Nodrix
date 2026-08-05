"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Editor JSON crudo para los 4 grupos de configuración que no son
 * `loan_terms.tiers` (qualification, bankingParams, probabilities,
 * assumptions) -- ver instrucción del plan: "puedes hacer un editor más
 * simple... o incluso un editor JSON crudo con validación de sintaxis si el
 * tiempo no alcanza para un formulario dedicado a cada uno". Valida
 * sintaxis JSON en cada cambio y expone el objeto parseado al padre solo
 * cuando es válido.
 */
export function JsonGroupEditor({
  label,
  description,
  value,
  onChange,
}: {
  label: string
  description?: string
  value: unknown
  onChange: (parsed: unknown, valid: boolean) => void
}) {
  const [text, setText] = React.useState(() => JSON.stringify(value, null, 2))
  const [error, setError] = React.useState<string | null>(null)

  // Re-sincroniza el textarea si el valor externo cambia (ej. al cargar
  // una versión distinta), pero no mientras el usuario está tipeando.
  const lastExternalValue = React.useRef(value)
  React.useEffect(() => {
    if (lastExternalValue.current !== value) {
      lastExternalValue.current = value
      setText(JSON.stringify(value, null, 2))
      setError(null)
    }
  }, [value])

  function handleChange(raw: string) {
    setText(raw)
    try {
      const parsed = JSON.parse(raw)
      setError(null)
      onChange(parsed, true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "JSON inválido.")
      onChange(null, false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-sm font-semibold text-text-primary">{label}</h3>
        {description && <p className="text-xs text-text-tertiary">{description}</p>}
      </div>
      <textarea
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        rows={10}
        spellCheck={false}
        className={cn(
          "w-full rounded-md border bg-surface-elevated px-3 py-2 font-mono text-xs text-text-primary",
          error ? "border-status-error" : "border-glass-border"
        )}
      />
      {error && <p className="text-xs text-status-error">JSON inválido: {error}</p>}
    </div>
  )
}
