"use client"

import * as React from "react"
import { PlayCircle, X } from "lucide-react"

import { HookVideo } from "@/components/dashboard/HookVideo"

/**
 * Envuelve el video-gancho de la etapa (HookVideo) como un frame flotante que
 * se muestra AL FRENTE del dashboard (overlay), guiando al cliente apenas
 * entra a una etapa nueva. El cliente puede cerrarlo (X o clic afuera) y
 * volver a abrirlo después con el botón "Ver video guía" que queda fijo.
 *
 * Se reabre automáticamente cada vez que cambia `stageKey` (nueva etapa) --
 * el cliente vuelve a ver el gancho correspondiente aunque haya cerrado el
 * de la etapa anterior.
 */
function GuideVideoOverlay({ title, videoUrl, stageKey }: { title: string; videoUrl?: string; stageKey: string }) {
  const [open, setOpen] = React.useState(true)
  const lastStageKey = React.useRef(stageKey)

  React.useEffect(() => {
    if (lastStageKey.current !== stageKey) {
      lastStageKey.current = stageKey
      setOpen(true)
    }
  }, [stageKey])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="glass-card flex w-fit items-center gap-1.5 rounded-full border border-neon-cyan/40 px-3 py-1.5 text-[11.5px] font-medium text-text-secondary transition-colors duration-200 hover:text-text-primary"
      >
        <PlayCircle className="size-4 text-neon-cyan" aria-hidden="true" />
        Ver video guía
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onClick={() => setOpen(false)}
        >
          <div className="relative w-full max-w-xl" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar video"
              className="absolute -top-3 -right-3 z-10 flex size-8 items-center justify-center rounded-full border border-glass-border bg-deep text-text-secondary transition-colors duration-200 hover:text-text-primary"
            >
              <X className="size-4" />
            </button>
            <HookVideo title={title} videoUrl={videoUrl} />
          </div>
        </div>
      )}
    </>
  )
}

export { GuideVideoOverlay }
