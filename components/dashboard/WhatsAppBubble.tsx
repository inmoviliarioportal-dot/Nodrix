"use client"

import { MessageCircle } from "lucide-react"

export interface WhatsAppBubbleProps {
  /** Número de WhatsApp en formato internacional (sin "+", sin espacios). Mock hasta que se guarde un teléfono real por asesor. */
  whatsappNumber?: string
  /** Nombre y apellido del asesor asignado a la solicitud (si ya hay uno). */
  advisorName?: string | null
}

function initialsFrom(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

/**
 * Burbuja flotante de contacto con el asesor -- reemplaza a `AdvisorCard`
 * (que quedaba enterrada al final del dashboard). Fija en la esquina
 * inferior derecha, visible en cualquier scroll de las páginas del cliente.
 *
 * Cuando ya hay un asesor asignado, se muestra su nombre + un avatar de
 * iniciales (no una foto genérica -- no tenemos foto real del asesor
 * guardada, y mostrar una foto de stock haciéndola pasar por "tu asesor"
 * sería engañoso) para generar cercanía y motivar el contacto.
 */
function WhatsAppBubble({ whatsappNumber = "56900000000", advisorName }: WhatsAppBubbleProps) {
  const waHref = `https://wa.me/${whatsappNumber}`
  const name = advisorName?.trim() || null

  return (
    <a
      href={waHref}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={name ? `Contactar a ${name}, tu asesor, por WhatsApp` : "Contactar a tu asesor por WhatsApp"}
      className="glow-purple fixed right-5 bottom-5 z-50 flex items-center gap-2.5 rounded-full border border-neon-green/40 bg-surface py-1.5 pr-4 pl-1.5 shadow-lg transition-transform duration-200 ease-out hover:scale-105 active:scale-95"
    >
      <span className="relative flex size-11 shrink-0 items-center justify-center rounded-full bg-neon-green text-[13px] font-bold text-white">
        {name ? initialsFrom(name) : <MessageCircle className="size-5" aria-hidden />}
      </span>
      <span className="flex flex-col text-left">
        <span className="text-[10px] leading-tight font-semibold tracking-wide text-text-tertiary uppercase">
          {name ? "Tu asesor" : "Asesoría humana"}
        </span>
        <span className="text-[13px] leading-tight font-semibold text-text-primary">
          {name ?? "Escríbenos"}
        </span>
      </span>
    </a>
  )
}

export { WhatsAppBubble }
