import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

interface AuthCardProps {
  title: string
  description?: string
  children: ReactNode
  /** Ancho máximo del card (ej. "max-w-5xl" para el formulario de registro, más largo). Default: "max-w-4xl". */
  className?: string
  /** URL de foto de propiedad para el panel lateral (placeholder tipo Unsplash, como en el mockup). */
  imageUrl?: string
  imageAlt?: string
  /** Cita editorial en italic sobre el overlay de la foto. */
  quote?: string
}

const DEFAULT_IMAGE_URL =
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80"
const DEFAULT_QUOTE = "Claridad total sobre mi capacidad de inversión."

/**
 * Card contenedora compartida por las páginas de autenticación (login,
 * registro, recuperar/restablecer contraseña). Layout partido tipo
 * "editorial real estate" — ver .claude/design-system/tokens.md — panel
 * izquierdo con el formulario sobre fondo blanco, panel derecho con foto de
 * propiedad + overlay de cita. El panel de foto se oculta en mobile
 * (`hidden lg:block`) para que el formulario ocupe el ancho completo.
 */
function AuthCard({
  title,
  description,
  children,
  className,
  imageUrl = DEFAULT_IMAGE_URL,
  imageAlt = "Foto de propiedad",
  quote = DEFAULT_QUOTE,
}: AuthCardProps) {
  return (
    <div className="flex w-full items-center justify-center py-6 sm:py-10">
      <div
        className={cn(
          "glass-card grid w-full max-w-4xl grid-cols-1 overflow-hidden rounded-3xl p-0 lg:grid-cols-2",
          className
        )}
      >
        <div className="relative hidden min-h-[520px] lg:block">
          <img src={imageUrl} alt={imageAlt} className="absolute inset-0 h-full w-full object-cover" />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(22,50,79,0) 40%, rgba(14,34,55,0.82) 100%)",
            }}
          />
          {quote && (
            <p className="absolute inset-x-0 bottom-0 p-7 font-heading text-lg italic leading-relaxed text-white">
              &ldquo;{quote}&rdquo;
            </p>
          )}
        </div>
        <div className="flex flex-col justify-center px-6 py-9 sm:px-10 sm:py-11">
          <div className="flex flex-col gap-1 pb-6">
            <h2 className="font-heading text-2xl font-semibold text-text-primary">{title}</h2>
            {description && <p className="text-sm text-text-tertiary">{description}</p>}
          </div>
          <div className="flex flex-col gap-5">{children}</div>
        </div>
      </div>
    </div>
  )
}

export { AuthCard }
