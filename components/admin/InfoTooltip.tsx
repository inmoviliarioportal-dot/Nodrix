"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { HelpCircleIcon } from "lucide-react"

const PANEL_WIDTH = 256 // w-64
const VIEWPORT_MARGIN = 12

/**
 * Botón "?" que explica qué mide una analítica y cómo se calcula, para dar
 * contexto operativo sin saturar el header con texto permanente. Se abre al
 * click/tap (no solo hover) para que funcione igual en mobile; se cierra al
 * hacer click afuera o con Escape.
 *
 * El panel se renderiza vía portal en document.body con `position: fixed`,
 * calculando sus coordenadas desde el botón -- si se anclara con
 * `position: absolute` dentro de la card (como antes), quedaba oculto detrás
 * de cards vecinas: `animate-fade-in-up` aplica `transform`, lo que crea un
 * nuevo stacking context por card, y ese contexto pinta por encima del
 * `z-index` interno del tooltip sin importar qué tan alto sea.
 */
export function InfoTooltip({ what, how }: { what: string; how: string }) {
  const [open, setOpen] = React.useState(false)
  const [position, setPosition] = React.useState<{ top: number; left: number } | null>(null)
  const buttonRef = React.useRef<HTMLButtonElement>(null)
  const panelRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open) return

    function updatePosition() {
      const rect = buttonRef.current?.getBoundingClientRect()
      if (!rect) return
      const left = Math.min(
        Math.max(VIEWPORT_MARGIN, rect.left + rect.width / 2 - PANEL_WIDTH / 2),
        window.innerWidth - PANEL_WIDTH - VIEWPORT_MARGIN
      )
      setPosition({ top: rect.bottom + 8, left })
    }

    updatePosition()

    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) return
      setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }

    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    window.addEventListener("scroll", updatePosition, true)
    window.addEventListener("resize", updatePosition)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("scroll", updatePosition, true)
      window.removeEventListener("resize", updatePosition)
    }
  }, [open])

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Qué mide esta analítica y cómo se calcula"
        aria-expanded={open}
        className="flex size-4 shrink-0 items-center justify-center rounded-full text-text-tertiary transition-colors duration-200 hover:text-neon-cyan"
      >
        <HelpCircleIcon className="size-3.5" aria-hidden="true" />
      </button>

      {open &&
        position &&
        createPortal(
          <div
            ref={panelRef}
            role="tooltip"
            className="glass-surface fixed z-[999] w-64 rounded-xl border border-glass-border bg-dark-secondary p-3 text-left shadow-2xl"
            style={{ top: position.top, left: position.left }}
          >
            <p className="text-[11px] font-bold uppercase tracking-wide text-neon-cyan">Qué mide</p>
            <p className="mt-0.5 text-xs text-text-secondary">{what}</p>
            <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-neon-cyan">Cómo se calcula</p>
            <p className="mt-0.5 text-xs text-text-secondary">{how}</p>
          </div>,
          document.body
        )}
    </>
  )
}
