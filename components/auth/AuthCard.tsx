import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

interface AuthCardProps {
  title: string
  description?: string
  children: ReactNode
  /** Ancho máximo del card (ej. "max-w-2xl" para formularios más largos). Default: "max-w-md". */
  className?: string
}

/**
 * Card contenedora compartida por las páginas de registro y login.
 * Glassmorphism sobre fondo ambiental (rediseño v2 — ver
 * .claude/design-system/tokens.md). Centra el formulario en la pantalla.
 */
function AuthCard({ title, description, children, className }: AuthCardProps) {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] w-full items-center justify-center py-8">
      <div className={cn("glass-card w-full max-w-md rounded-2xl p-6 sm:p-8", className)}>
        <div className="flex flex-col gap-1 pb-5">
          <h2 className="text-xl font-semibold text-text-primary">{title}</h2>
          {description && (
            <p className="text-sm text-text-secondary">{description}</p>
          )}
        </div>
        <div className="flex flex-col gap-5">{children}</div>
      </div>
    </div>
  )
}

export { AuthCard }
