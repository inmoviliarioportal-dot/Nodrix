import type { LucideIcon } from "lucide-react"

interface TrustBadgeProps {
  icon: LucideIcon
  label: string
  glow?: "cyan" | "purple" | "green" | "gold"
}

const GLOW_CLASS: Record<NonNullable<TrustBadgeProps["glow"]>, string> = {
  cyan: "text-neon-cyan",
  purple: "text-neon-purple",
  green: "text-neon-green",
  gold: "text-gold",
}

/**
 * Card pequeña de "trust signal" para la Landing — glass sobre fondo ambiental.
 */
function TrustBadge({ icon: Icon, label, glow = "cyan" }: TrustBadgeProps) {
  return (
    <div className="glass-card flex items-center gap-3 rounded-xl px-4 py-3">
      <Icon className={`size-5 shrink-0 ${GLOW_CLASS[glow]}`} aria-hidden="true" />
      <span className="text-sm text-text-secondary">{label}</span>
    </div>
  )
}

export { TrustBadge }
