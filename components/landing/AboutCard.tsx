import type { ReactNode } from "react"

interface AboutCardProps {
  title: string
  description: string
  icon: ReactNode
  delay?: number
}

/**
 * Tarjeta de la sección "Qué es Nodrix" (#nodrix en la landing). Misma base
 * visual que `StepCard` -- card glass, ícono en cuadro tinte lavanda y
 * animación de entrada escalonada -- pero sin badge numerado, porque acá los
 * items NO son una secuencia: son atributos de la plataforma y da lo mismo el
 * orden en que se lean.
 */
function AboutCard({ title, description, icon, delay = 0 }: AboutCardProps) {
  return (
    <div
      className="glass-card interactive-lift animate-fade-in-up flex flex-col gap-3 rounded-2xl p-6"
      style={{ "--animate-delay": `${delay}ms` } as React.CSSProperties}
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-neon-cyan">
        {icon}
      </span>
      <h3 className="font-heading text-base font-bold text-text-primary">{title}</h3>
      <p className="text-xs leading-relaxed text-text-tertiary">{description}</p>
    </div>
  )
}

export { AboutCard }
