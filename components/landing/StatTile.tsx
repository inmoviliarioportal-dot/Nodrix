import type { LucideIcon } from "lucide-react"

interface StatTileProps {
  icon: LucideIcon
  value: string
  label: string
  sublabel?: string
  highlight?: string
}

/**
 * Tile de la barra de confianza (4 columnas) — icono en círculo tinte azul,
 * valor destacado en navy/serif y label de dos líneas en gris, replicando
 * el mockup "trust blue" de referencia.
 */
function StatTile({ icon: Icon, value, label, sublabel, highlight }: StatTileProps) {
  return (
    <div className="flex items-start gap-3 px-2 py-1 text-left">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-neon-cyan">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="flex flex-col">
        <span className="font-heading text-[15px] font-bold text-text-primary">{value}</span>
        <span className="text-xs leading-snug text-text-tertiary">
          {label}
          {highlight ? (
            <>
              <br />
              <span className="font-semibold text-neon-cyan">{highlight}</span>
            </>
          ) : null}
          {sublabel ? <span className="block">{sublabel}</span> : null}
        </span>
      </div>
    </div>
  )
}

export { StatTile }
