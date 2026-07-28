import type { LucideIcon } from "lucide-react"

interface StepCardProps {
  step: number
  icon: LucideIcon
  title: string
  description: string
}

/**
 * Tarjeta de paso para la sección "Cómo funciona". El número + ícono hacen
 * eco visual del componente Timeline (mismo lenguaje de "paso numerado"
 * usado en el dashboard del cliente), reforzando consistencia de marca.
 */
function StepCard({ step, icon: Icon, title, description }: StepCardProps) {
  return (
    <div className="relative flex flex-col gap-2 rounded-2xl border border-glass-border p-5">
      <div className="flex items-center gap-2">
        <span className="font-heading text-xs font-bold text-neon-cyan">
          {String(step).padStart(2, "0")}
        </span>
        <Icon className="size-4 text-text-tertiary" aria-hidden="true" />
      </div>
      <h3 className="font-heading text-base font-semibold text-text-primary">{title}</h3>
      <p className="text-xs leading-relaxed text-text-secondary">{description}</p>
    </div>
  )
}

export { StepCard }
