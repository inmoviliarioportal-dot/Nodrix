"use client"

import { ChevronRight, User } from "lucide-react"

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
 * Tarjeta flotante de contacto con el asesor -- reemplaza a `AdvisorCard`
 * (que quedaba enterrada al final del dashboard). Fija en la esquina
 * inferior derecha, visible en cualquier scroll de las páginas del cliente.
 *
 * Cuando ya hay un asesor asignado, se muestra su nombre + un avatar de
 * iniciales (no una foto genérica -- no tenemos foto real del asesor
 * guardada, y mostrar una foto de stock haciéndola pasar por "tu asesor"
 * sería engañoso) para generar cercanía y motivar el contacto. El ícono de
 * WhatsApp queda como detalle secundario (indicador verde), no como
 * protagonista del botón.
 */
function WhatsAppBubble({ whatsappNumber = "56900000000", advisorName }: WhatsAppBubbleProps) {
  const waHref = `https://wa.me/${whatsappNumber}`
  const name = advisorName?.trim() || null

  return (
    <a
      href={waHref}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={name ? `Contactar a ${name}, tu asesor, por WhatsApp` : "Hablar con mi asesor por WhatsApp"}
      className="fixed right-4 bottom-4 z-50 flex items-center gap-2.5 rounded-2xl border border-border/60 bg-white py-2 pr-3 pl-2 shadow-[0_4px_16px_rgba(15,23,42,0.12)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(15,23,42,0.16)] active:translate-y-0 active:scale-[0.98] sm:right-5 sm:bottom-5 sm:gap-3 sm:py-2.5 sm:pr-4"
    >
      <span className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-dark-tertiary text-[11px] font-bold text-neon-cyan sm:size-10 sm:text-[12px]">
        {name ? initialsFrom(name) : <User className="size-4" aria-hidden />}
        <span
          className="absolute -right-0.5 -bottom-0.5 flex size-3 items-center justify-center rounded-full border-2 border-white bg-neon-green sm:size-3.5"
          aria-hidden="true"
        />
      </span>
      <span className="flex min-w-0 flex-col text-left">
        <span className="hidden text-[10px] leading-tight font-semibold tracking-wide text-text-tertiary uppercase sm:block">
          Tu asesor personal
        </span>
        <span className="max-w-[38vw] truncate text-[12.5px] leading-tight font-semibold text-text-primary sm:max-w-none sm:text-[13.5px]">
          {name ?? "Hablar con mi asesor"}
        </span>
      </span>
      <ChevronRight className="hidden size-4 shrink-0 text-text-tertiary sm:block" aria-hidden="true" />
    </a>
  )
}

export { WhatsAppBubble }
