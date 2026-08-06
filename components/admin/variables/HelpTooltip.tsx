"use client"

import * as React from "react"
import { HelpCircle } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Botón "?" junto a un campo, que al hacer click/tap muestra una tarjeta
 * explicando qué hace el parámetro, un ejemplo concreto y cómo impacta un
 * cambio -- pensado para que un admin/gerencia sin contexto técnico pueda
 * editar estos valores sin adivinar. Click-to-toggle (no solo hover) para
 * que funcione igual en touch; se cierra con click afuera o Escape.
 */
export function HelpTooltip({
  what,
  example,
  impact,
}: {
  /** Qué es este parámetro, en una frase simple. */
  what: string
  /** Un ejemplo concreto con números reales. */
  example: string
  /** Qué pasa si se sube o se baja este valor. */
  impact: string
}) {
  const [open, setOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLSpanElement>(null)

  React.useEffect(() => {
    if (!open) return
    function handlePointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [open])

  return (
    <span ref={containerRef} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Qué significa este parámetro"
        className={cn(
          "inline-flex size-4 items-center justify-center rounded-full text-text-tertiary transition-colors duration-200 hover:text-neon-cyan",
          open && "text-neon-cyan"
        )}
      >
        <HelpCircle className="size-3.5" aria-hidden="true" />
      </button>
      {open && (
        <div
          role="tooltip"
          className="absolute left-1/2 top-full z-20 mt-2 w-72 -translate-x-1/2 rounded-xl border border-glass-border bg-surface-elevated p-3.5 text-left shadow-lg"
        >
          <p className="text-xs leading-relaxed text-text-primary">{what}</p>
          <p className="mt-2 text-xs leading-relaxed text-text-secondary">
            <span className="font-semibold text-text-tertiary">Ejemplo: </span>
            {example}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-status-warning">
            <span className="font-semibold">Si lo cambias: </span>
            {impact}
          </p>
        </div>
      )}
    </span>
  )
}
