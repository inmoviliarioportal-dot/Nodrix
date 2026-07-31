"use client"

import * as React from "react"
import { PlayCircle, X, FileText, UploadCloud, AlertTriangle } from "lucide-react"

import { HookVideo } from "@/components/dashboard/HookVideo"
import { Button } from "@/components/ui/button"

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
        className="glass-card flex w-fit items-center gap-1.5 rounded-full border border-neon-cyan/40 px-4 py-2 text-[12.5px] font-semibold text-neon-cyan transition-colors duration-200 hover:bg-neon-cyan/5"
      >
        <PlayCircle className="size-4 text-neon-cyan" aria-hidden="true" />
        Ver video guía
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#101B3D]/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onClick={() => setOpen(false)}
        >
          <div
            className="animate-scale-in relative flex w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar video"
              className="absolute top-4 right-4 z-10 flex size-9 items-center justify-center rounded-full border border-glass-border bg-white text-text-secondary transition-colors duration-200 hover:text-text-primary"
            >
              <X className="size-4" />
            </button>

            <HookVideo title={title} videoUrl={videoUrl} />

            <div className="flex flex-col gap-4 p-6">
              <div>
                <h2 className="font-heading text-xl font-semibold text-text-primary">{title}</h2>
                <p className="mt-0.5 text-[12.5px] text-text-tertiary">Video guía · 2 min</p>
                <p className="mt-2 text-[13px] leading-relaxed text-text-secondary">
                  Te explicamos de forma simple qué subir, para qué sirve cada documento y cómo avanzar
                  más rápido con tu solicitud.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <span className="glass-card flex flex-col items-center gap-1.5 rounded-xl p-3 text-center text-[11.5px] font-medium text-text-secondary">
                  <FileText className="size-4 text-neon-cyan" aria-hidden="true" />
                  Documentos requeridos
                </span>
                <span className="glass-card flex flex-col items-center gap-1.5 rounded-xl p-3 text-center text-[11.5px] font-medium text-text-secondary">
                  <UploadCloud className="size-4 text-neon-green" aria-hidden="true" />
                  Consejos para subir archivos
                </span>
                <span className="glass-card flex flex-col items-center gap-1.5 rounded-xl p-3 text-center text-[11.5px] font-medium text-text-secondary">
                  <AlertTriangle className="size-4 text-gold" aria-hidden="true" />
                  Errores frecuentes
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-[13px] font-medium text-text-tertiary transition-colors duration-200 hover:text-text-primary"
                >
                  Ver más tarde
                </button>
                <Button className="gap-1.5 rounded-full bg-neon-cyan text-white hover:bg-neon-cyan/90" onClick={() => setOpen(false)}>
                  Entendido
                  <span aria-hidden="true">✦</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export { GuideVideoOverlay }
