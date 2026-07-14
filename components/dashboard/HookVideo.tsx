import { PlayCircle } from "lucide-react"

/**
 * Placeholder de "video de gancho" por etapa — contenido mock hasta que
 * existan URLs reales (YouTube/Vimeo/mp4) por etapa. Mantiene el layout de
 * un embed real (aspect-ratio 16:9) para que sea un reemplazo directo
 * cuando el contenido llegue: simplemente sustituir este componente por un
 * `<iframe>`/`<video>` con la URL correspondiente a `videoTitle`.
 */
function HookVideo({ title }: { title: string }) {
  return (
    <div className="glass-card overflow-hidden rounded-2xl">
      <div className="bg-surface-elevated relative flex aspect-video w-full items-center justify-center">
        <div className="bg-deep-ambient absolute inset-0" aria-hidden="true" />
        <button
          type="button"
          className="glow-cyan relative z-10 flex size-14 items-center justify-center rounded-full border border-neon-cyan bg-neon-cyan/10 text-neon-cyan transition-transform duration-200 hover:scale-105"
          aria-label={`Reproducir video: ${title}`}
        >
          <PlayCircle className="size-8" aria-hidden="true" />
        </button>
      </div>
      <div className="p-4">
        <p className="text-sm font-medium text-text-primary">{title}</p>
        <p className="text-xs text-text-tertiary">Video informativo — próximamente</p>
      </div>
    </div>
  )
}

export { HookVideo }
