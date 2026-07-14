"use client"

import { useEffect, useRef } from "react"
import { X, ShieldCheck } from "lucide-react"

interface RetentionModalProps {
  open: boolean
  onDismiss: () => void
  onStay: () => void
}

/**
 * "Rama de Rescate" — modal de retención mostrado en exit-intent (desktop) o
 * al detectar gesto de "atrás" (mobile). Siempre dismissable: X visible, click
 * en el scrim, o tecla Escape. Nunca atrapa al usuario.
 */
export function RetentionModal({ open, onDismiss, onStay }: RetentionModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss()
    }
    document.addEventListener("keydown", handleKeyDown)
    dialogRef.current?.focus()
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [open, onDismiss])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="retention-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onDismiss()
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="glass-card relative w-full max-w-md rounded-2xl p-8 outline-none"
      >
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Cerrar"
          className="absolute right-4 top-4 rounded-full p-1.5 text-text-tertiary transition-colors duration-200 hover:bg-white/5 hover:text-text-primary"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="glow-green mb-5 inline-flex items-center justify-center rounded-full bg-white/5 p-3">
          <ShieldCheck className="h-6 w-6 text-[var(--neon-green)]" />
        </div>

        <h2 id="retention-modal-title" className="mb-2 text-xl font-semibold text-text-primary">
          Espera — tu cupo aún está disponible
        </h2>
        <p className="mb-1 text-sm text-text-secondary">
          +500 inversionistas ya aseguraron su cupo este mes con condiciones
          similares. Tu propuesta personalizada sigue activa.
        </p>
        <p className="mb-6 text-xs text-text-tertiary">
          No perderás tu progreso: puedes volver a revisar los números cuando
          quieras.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row-reverse">
          <button
            type="button"
            onClick={onStay}
            className="glow-cyan flex-1 rounded-xl bg-[var(--neon-cyan)]/10 border border-[var(--neon-cyan)]/40 px-4 py-3 text-sm font-semibold text-text-primary transition-colors duration-200 hover:bg-[var(--neon-cyan)]/20"
          >
            Volver a mi propuesta
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="flex-1 rounded-xl border border-glass-border px-4 py-3 text-sm text-text-secondary transition-colors duration-200 hover:bg-white/5"
          >
            No, gracias
          </button>
        </div>
      </div>
    </div>
  )
}
