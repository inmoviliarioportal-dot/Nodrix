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
    <div className="glass-card relative flex flex-col gap-3 rounded-2xl p-6">
      <div className="flex items-center gap-3">
        <span className="glow-cyan flex size-10 shrink-0 items-center justify-center rounded-full border border-neon-cyan bg-neon-cyan/10 text-sm font-semibold text-neon-cyan">
          {step}
        </span>
        <Icon className="size-5 text-text-secondary" aria-hidden="true" />
      </div>
      <h3 className="font-heading text-lg font-semibold text-text-primary">{title}</h3>
      <p className="text-sm leading-relaxed text-text-secondary">{description}</p>
    </div>
  )
}

export { StepCard }
