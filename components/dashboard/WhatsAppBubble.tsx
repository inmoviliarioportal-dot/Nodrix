"use client"

import { MessageCircle } from "lucide-react"

export interface WhatsAppBubbleProps {
  /** Número de WhatsApp en formato internacional (sin "+", sin espacios). Mock hasta que exista asignación real de asesor. */
  whatsappNumber?: string
}

/**
 * Burbuja flotante de contacto con el asesor -- reemplaza a `AdvisorCard`
 * (que quedaba enterrada al final del dashboard). Fija en la esquina
 * inferior derecha, visible en cualquier scroll de las páginas del cliente.
 */
function WhatsAppBubble({ whatsappNumber = "56900000000" }: WhatsAppBubbleProps) {
  const waHref = `https://wa.me/${whatsappNumber}`

  return (
    <a
      href={waHref}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contactar a tu asesor por WhatsApp"
      className="glow-purple fixed right-5 bottom-5 z-50 flex size-14 items-center justify-center rounded-full border border-neon-green/40 bg-neon-green text-deep shadow-lg transition-transform duration-200 ease-out hover:scale-105 active:scale-95"
    >
      <MessageCircle className="size-6" aria-hidden />
    </a>
  )
}

export { WhatsAppBubble }
