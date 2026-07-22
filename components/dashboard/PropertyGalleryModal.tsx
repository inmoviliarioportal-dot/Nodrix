"use client"

import * as React from "react"
import { X, ChevronLeft, ChevronRight, PlayCircle } from "lucide-react"

export interface PropertyGalleryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  propertyName: string
  images: string[]
  videoUrl: string | null
}

/**
 * Galería flotante (lightbox) que se abre al hacer clic en la imagen de una
 * propiedad dentro de una propuesta -- deja ver todas las fotos del
 * proyecto/inmueble y el video, si existe, ANTES de aceptar la propuesta.
 * Sin librerías externas: solo un overlay con navegación prev/next.
 */
function PropertyGalleryModal({ open, onOpenChange, propertyName, images, videoUrl }: PropertyGalleryModalProps) {
  // El video (si existe) se muestra como el último "slide" de la galería.
  const slides = React.useMemo(
    () => [...images.map((src) => ({ type: "image" as const, src })), ...(videoUrl ? [{ type: "video" as const, src: videoUrl }] : [])],
    [images, videoUrl]
  )
  const [index, setIndex] = React.useState(0)

  React.useEffect(() => {
    if (open) setIndex(0)
  }, [open])

  React.useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false)
      if (e.key === "ArrowRight") setIndex((i) => (i + 1) % slides.length)
      if (e.key === "ArrowLeft") setIndex((i) => (i - 1 + slides.length) % slides.length)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, slides.length, onOpenChange])

  if (!open || slides.length === 0) return null

  const current = slides[index]

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Galería de ${propertyName}`}
      onClick={() => onOpenChange(false)}
    >
      <button
        type="button"
        onClick={() => onOpenChange(false)}
        aria-label="Cerrar galería"
        className="absolute top-4 right-4 flex size-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition-colors hover:bg-white/20"
      >
        <X className="size-5" />
      </button>

      <div className="flex max-h-[85vh] w-full max-w-4xl flex-col gap-3" onClick={(e) => e.stopPropagation()}>
        <p className="text-center text-sm font-medium text-white/80">
          {propertyName} · {index + 1}/{slides.length}
        </p>

        <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-xl bg-black">
          {slides.length > 1 && (
            <button
              type="button"
              onClick={() => setIndex((i) => (i - 1 + slides.length) % slides.length)}
              aria-label="Anterior"
              className="absolute left-2 z-10 flex size-9 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
            >
              <ChevronLeft className="size-5" />
            </button>
          )}

          {current.type === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={current.src} alt={propertyName} className="max-h-[70vh] w-full object-contain" />
          ) : (
            <video controls autoPlay className="max-h-[70vh] w-full" src={current.src} />
          )}

          {slides.length > 1 && (
            <button
              type="button"
              onClick={() => setIndex((i) => (i + 1) % slides.length)}
              aria-label="Siguiente"
              className="absolute right-2 z-10 flex size-9 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
            >
              <ChevronRight className="size-5" />
            </button>
          )}
        </div>

        {slides.length > 1 && (
          <div className="flex justify-center gap-2 overflow-x-auto pb-1">
            {slides.map((slide, i) => (
              <button
                key={`${slide.src}-${i}`}
                type="button"
                onClick={() => setIndex(i)}
                className={`relative size-14 shrink-0 overflow-hidden rounded-md border-2 transition-colors ${
                  i === index ? "border-neon-cyan" : "border-transparent opacity-60 hover:opacity-100"
                }`}
              >
                {slide.type === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={slide.src} alt="" className="size-full object-cover" />
                ) : (
                  <span className="flex size-full items-center justify-center bg-white/10 text-white">
                    <PlayCircle className="size-5" />
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export { PropertyGalleryModal }
