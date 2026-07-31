import type { ReactNode } from "react"

interface StepCardProps {
  step: number
  title: string
  description: string
  icon: ReactNode
  delay?: number
  /** Muestra el conector punteado hacia la siguiente card (oculto en la última). */
  showConnector?: boolean
}

/**
 * Tarjeta de paso para "Cómo funciona" — badge numerado circular azul,
 * ilustración simple en cuadro tinte lavanda y conector punteado horizontal
 * entre cards en desktop, replicando el mockup de referencia.
 */
function StepCard({ step, title, description, icon, delay = 0, showConnector = false }: StepCardProps) {
  return (
    <div
      className="glass-card interactive-lift animate-fade-in-up relative flex flex-col gap-4 rounded-2xl p-6"
      style={{ "--animate-delay": `${delay}ms` } as React.CSSProperties}
    >
      {showConnector ? (
        <span
          aria-hidden="true"
          className="absolute top-1/2 -right-5 hidden h-px w-10 border-t-2 border-dashed border-neon-cyan/30 sm:block"
        />
      ) : null}
      <div className="flex items-center justify-between">
        <span className="font-heading flex size-9 items-center justify-center rounded-full bg-secondary text-sm font-bold text-neon-cyan">
          {step}
        </span>
        <span className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-secondary text-neon-cyan">
          {icon}
        </span>
      </div>
      <h3 className="font-heading text-base font-bold text-text-primary">{title}</h3>
      <p className="text-xs leading-relaxed text-text-tertiary">{description}</p>
    </div>
  )
}

export { StepCard }
