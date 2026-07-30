interface StatTileProps {
  value: string
  label: string
  /** Cuando la tile vive sobre el fondo navy (franja de stats), usa cifra
   * oro y label claro en vez de los tonos por defecto para texto sobre
   * fondo cálido. */
  onDark?: boolean
}

/**
 * Tile de estadística para la franja de confianza de la Landing. Números
 * en tabular-nums para evitar layout shift al comparar cifras.
 */
function StatTile({ value, label, onDark = false }: StatTileProps) {
  return (
    <div className="flex flex-col items-center gap-1.5 px-3 py-2 text-center">
      <span
        className={`font-heading text-2xl font-semibold tabular-nums sm:text-3xl ${
          onDark ? "text-gold" : "text-neon-cyan"
        }`}
      >
        {value}
      </span>
      <span className={`text-xs ${onDark ? "text-white/70" : "text-text-secondary"}`}>{label}</span>
    </div>
  )
}

export { StatTile }
