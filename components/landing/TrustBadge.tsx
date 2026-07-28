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
    <div className="flex items-center justify-center gap-2 rounded-xl border border-glass-border px-3 py-2.5">
      <Icon className={`size-4 shrink-0 ${GLOW_CLASS[glow]}`} aria-hidden="true" />
      <span className="text-xs text-text-secondary">{label}</span>
    </div>
  )
}

export { TrustBadge }
