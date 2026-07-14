import { PlayCircle } from "lucide-react"

/** Convierte una URL de YouTube/Vimeo (o un link directo a video) en una URL
 * de embed. Devuelve `null` si no se reconoce el formato (fallback a
 * placeholder). */
function getEmbedUrl(url: string): { kind: "iframe" | "video"; src: string } | null {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\./, "")

    if (host === "youtube.com" || host === "youtube-nocookie.com") {
      const videoId = parsed.searchParams.get("v")
      if (videoId) return { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${videoId}` }
      const match = parsed.pathname.match(/\/embed\/([^/?]+)/)
      if (match) return { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${match[1]}` }
      return null
    }
    if (host === "youtu.be") {
      const videoId = parsed.pathname.slice(1)
      if (videoId) return { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${videoId}` }
      return null
    }
    if (host === "vimeo.com") {
      const videoId = parsed.pathname.split("/").filter(Boolean)[0]
      if (videoId) return { kind: "iframe", src: `https://player.vimeo.com/video/${videoId}` }
      return null
    }
    if (host === "player.vimeo.com") {
      return { kind: "iframe", src: url }
    }
    if (/\.(mp4|webm|ogg)$/i.test(parsed.pathname)) {
      return { kind: "video", src: url }
    }
    return null
  } catch {
    return null
  }
}

/**
 * Video de "gancho" por etapa. Si `stageContent.ts` define `videoUrl` para
 * la etapa actual (YouTube/Vimeo/mp4 directo), se embebe de verdad; si no
 * hay URL o no se reconoce el formato, muestra el placeholder mock —
 * reemplazar el contenido en `stageContent.ts`, este componente no necesita
 * cambios cuando llegue la URL real.
 */
function HookVideo({ title, videoUrl }: { title: string; videoUrl?: string }) {
  const embed = videoUrl ? getEmbedUrl(videoUrl) : null

  return (
    <div className="glass-card overflow-hidden rounded-2xl">
      <div className="bg-surface-elevated relative flex aspect-video w-full items-center justify-center">
        {embed ? (
          embed.kind === "iframe" ? (
            <iframe
              src={embed.src}
              title={title}
              className="absolute inset-0 size-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video src={embed.src} controls className="absolute inset-0 size-full" />
          )
        ) : (
          <>
            <div className="bg-deep-ambient absolute inset-0" aria-hidden="true" />
            <button
              type="button"
              className="glow-cyan relative z-10 flex size-14 items-center justify-center rounded-full border border-neon-cyan bg-neon-cyan/10 text-neon-cyan transition-transform duration-200 hover:scale-105"
              aria-label={`Reproducir video: ${title}`}
            >
              <PlayCircle className="size-8" aria-hidden="true" />
            </button>
          </>
        )}
      </div>
      <div className="p-4">
        <p className="text-sm font-medium text-text-primary">{title}</p>
        {!embed && <p className="text-xs text-text-tertiary">Video informativo — próximamente</p>}
      </div>
    </div>
  )
}

export { HookVideo }
