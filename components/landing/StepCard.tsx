interface StepCardProps {
  step: number
  title: string
  description: string
  delay?: number
}

/**
 * Tarjeta de paso para la sección "Cómo funciona" — replica el patrón del
 * mockup de referencia: badge numerado sólido navy (Newsreader) + título +
 * descripción, sobre card blanca con borde cálido.
 */
function StepCard({ step, title, description, delay = 0 }: StepCardProps) {
  return (
    <div
      className="glass-card interactive-lift animate-fade-in-up flex flex-col gap-3 rounded-2xl p-6"
      style={{ "--animate-delay": `${delay}ms` } as React.CSSProperties}
    >
      <span className="font-heading flex size-10 items-center justify-center rounded-xl bg-neon-cyan text-base font-semibold text-white">
        {String(step).padStart(2, "0")}
      </span>
      <h3 className="font-heading mt-1 text-base font-bold text-text-primary">{title}</h3>
      <p className="text-xs leading-relaxed text-text-tertiary">{description}</p>
    </div>
  )
}

export { StepCard }
