import { MessageCircle } from "lucide-react"

import { cn } from "@/lib/utils"

export interface AdvisorCardProps {
  /** Nombre del asesor asignado. Mock hasta que exista asignación real en Release 2. */
  name?: string
  /** Número de WhatsApp en formato internacional (sin "+", sin espacios). Mock. */
  whatsappNumber?: string
  className?: string
}

/**
 * Tarjeta de "traspaso humano": conexión directa con el asesor asignado.
 *
 * MOCK (Release 1): no existe backend de asignación de asesores todavía —
 * `name`/`whatsappNumber` son datos de ejemplo hasta que Release 2 traiga la
 * asignación real (asesor por application/backoffice).
 */
function AdvisorCard({
  name = "Sofía Hernández",
  whatsappNumber = "56900000000",
  className,
}: AdvisorCardProps) {
  const waHref = `https://wa.me/${whatsappNumber}`

  return (
    <div
      className={cn(
        "glass-card glow-purple flex flex-col items-center gap-4 rounded-2xl p-6 text-center sm:flex-row sm:text-left",
        className
      )}
    >
      <div
        aria-hidden
        className="flex size-16 shrink-0 items-center justify-center rounded-full border border-neon-purple/40 bg-neon-purple/10 text-xl font-semibold text-neon-purple"
      >
        {name
          .split(" ")
          .map((part) => part.charAt(0))
          .slice(0, 2)
          .join("")
          .toUpperCase()}
      </div>

      <div className="flex flex-1 flex-col gap-1">
        <span className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
          Tu asesor asignado
        </span>
        <span className="text-lg font-semibold text-text-primary">{name}</span>
        <span className="text-sm text-text-tertiary">
          Disponible para resolver tus dudas sobre el proceso.
        </span>
      </div>

      <a
        href={waHref}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-full border border-neon-green/40 bg-neon-green/10 px-4 py-2 text-sm font-medium text-neon-green transition-colors duration-200 hover:bg-neon-green/20"
      >
        <MessageCircle className="size-4" aria-hidden />
        Contactar por WhatsApp
      </a>
    </div>
  )
}

export { AdvisorCard }
