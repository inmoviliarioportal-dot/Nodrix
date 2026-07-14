interface StatTileProps {
  value: string
  label: string
  glow?: "cyan" | "purple" | "green" | "gold"
}

const GLOW_CLASS: Record<NonNullable<StatTileProps["glow"]>, string> = {
  cyan: "text-glow-cyan text-neon-cyan",
  purple: "text-glow-purple text-neon-purple",
  green: "text-glow-green text-neon-green",
  gold: "text-gold",
}

/**
 * Tile de estadística para la barra de confianza de la Landing. Números
 * en tabular-nums para evitar layout shift al comparar cifras.
 */
function StatTile({ value, label, glow = "cyan" }: StatTileProps) {
  return (
    <div className="glass-card flex flex-col items-center gap-1 rounded-2xl px-4 py-6 text-center">
      <span className={`font-heading text-3xl font-semibold tabular-nums sm:text-4xl ${GLOW_CLASS[glow]}`}>
        {value}
      </span>
      <span className="text-sm text-text-secondary">{label}</span>
    </div>
  )
}

export { StatTile }
