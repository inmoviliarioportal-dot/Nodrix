"use client"

import * as React from "react"
import { HelpCircleIcon } from "lucide-react"

/**
 * Botón "?" que explica qué mide una analítica y cómo se calcula, para dar
 * contexto operativo sin saturar el header con texto permanente. Se abre al
 * click/tap (no solo hover) para que funcione igual en mobile; se cierra al
 * hacer click afuera o con Escape.
 */
export function InfoTooltip({ what, how }: { what: string; how: string }) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Qué mide esta analítica y cómo se calcula"
        aria-expanded={open}
        className="flex size-4 shrink-0 items-center justify-center rounded-full text-text-tertiary transition-colors duration-200 hover:text-neon-cyan"
      >
        <HelpCircleIcon className="size-3.5" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="tooltip"
          className="glass-surface absolute left-1/2 top-full z-50 mt-2 w-64 -translate-x-1/2 rounded-xl border border-glass-border p-3 text-left shadow-xl"
        >
          <p className="text-[11px] font-bold uppercase tracking-wide text-neon-cyan">Qué mide</p>
          <p className="mt-0.5 text-xs text-text-secondary">{what}</p>
          <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-neon-cyan">Cómo se calcula</p>
          <p className="mt-0.5 text-xs text-text-secondary">{how}</p>
        </div>
      )}
    </div>
  )
}
