import type { LucideIcon } from "lucide-react"

interface FeatureCardProps {
  icon: LucideIcon
  title: string
  description: string
  glow?: "cyan" | "purple" | "green" | "gold"
}

const GLOW_WRAPPER_CLASS: Record<NonNullable<FeatureCardProps["glow"]>, string> = {
  cyan: "border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan",
  purple: "border-neon-purple/40 bg-neon-purple/10 text-neon-purple",
  green: "border-neon-green/40 bg-neon-green/10 text-neon-green",
  gold: "border-gold/40 bg-gold/10 text-gold",
}

/**
 * Card de feature para la grilla de "Por qué Nodrix". Cada feature usa un
 * color semántico distinto (cian = análisis/tech, púrpura = asesoría humana,
 * verde = seguridad, oro = resultados/premium) — mismo sistema de acentos
 * usado en el resto de la plataforma (Backoffice, Admin).
 */
function FeatureCard({ icon: Icon, title, description, glow = "cyan" }: FeatureCardProps) {
  return (
    <div className="glass-card flex flex-col gap-4 rounded-2xl p-6 transition-transform duration-200 hover:-translate-y-0.5">
      <span
        className={`flex size-11 shrink-0 items-center justify-center rounded-xl border ${GLOW_WRAPPER_CLASS[glow]}`}
      >
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <h3 className="font-heading text-lg font-semibold text-text-primary">{title}</h3>
      <p className="text-sm leading-relaxed text-text-secondary">{description}</p>
    </div>
  )
}

export { FeatureCard }
