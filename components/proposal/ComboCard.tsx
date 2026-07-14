import { MapPin, Building2 } from "lucide-react"
import type { ProposalProperty } from "./types"
import { formatCLP } from "./data"

interface ComboCardProps {
  properties: ProposalProperty[]
  onSelect: () => void
}

/** Promedia las métricas del combo cuando hay 1-3 propiedades sugeridas. */
function averageMetrics(properties: ProposalProperty[]) {
  const n = properties.length || 1
  const sum = properties.reduce(
    (acc, p) => ({
      capRate: acc.capRate + p.capRate,
      plusvalia: acc.plusvalia + p.plusvalia,
      flujoMensual: acc.flujoMensual + p.flujoMensual,
    }),
    { capRate: 0, plusvalia: 0, flujoMensual: 0 }
  )
  return {
    capRate: Math.round((sum.capRate / n) * 10) / 10,
    plusvalia: Math.round((sum.plusvalia / n) * 10) / 10,
    flujoMensual: Math.round(sum.flujoMensual / n),
  }
}

export function ComboCard({ properties, onSelect }: ComboCardProps) {
  const metrics = averageMetrics(properties)

  return (
    <div className="glass-card mx-auto w-full max-w-3xl rounded-3xl p-6 sm:p-10">
      <div className="mb-6 text-center sm:mb-8">
        <span className="inline-block rounded-full border border-glass-border bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-wide text-text-secondary">
          Combo Inversionista · Alta Rentabilidad
        </span>
        <h1 className="mt-4 text-2xl font-semibold text-text-primary sm:text-3xl">
          Tu propuesta personalizada está lista
        </h1>
        <p className="mt-2 text-sm text-text-tertiary">
          Cifras estimadas para el combo sugerido — valores ilustrativos hasta
          que el motor de pre-evaluación real esté disponible.
        </p>
      </div>

      {/* Números clave: 3 columnas desktop (>=1024px), stack vertical mobile (<768px) */}
      <div className="grid grid-cols-1 gap-6 border-y border-glass-border py-8 sm:grid-cols-3 sm:gap-4">
        <div className="text-center">
          <div
            className="text-glow-green font-variant-numeric-tabular text-5xl font-bold text-[var(--neon-green)]"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {metrics.capRate}%
          </div>
          <div className="mt-2 text-sm text-text-secondary">Cap Rate estimado</div>
        </div>
        <div className="text-center">
          <div
            className="text-glow-cyan text-5xl font-bold text-[var(--neon-cyan)]"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {metrics.plusvalia}%
          </div>
          <div className="mt-2 text-sm text-text-secondary">Plusvalía proyectada</div>
        </div>
        <div className="text-center">
          <div
            className="text-glow-purple text-4xl font-bold text-[var(--neon-purple)] sm:text-5xl"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {formatCLP(metrics.flujoMensual)}
          </div>
          <div className="mt-2 text-sm text-text-secondary">Flujo mensual estimado</div>
        </div>
      </div>

      {/* Mini-cards de propiedades del combo */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {properties.map((property) => (
          <div key={property.id} className="glass-surface rounded-xl p-4">
            <div className="mb-3 flex h-24 items-center justify-center rounded-lg bg-white/5">
              {property.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={property.imageUrl}
                  alt={property.name}
                  className="h-full w-full rounded-lg object-cover"
                />
              ) : (
                <Building2 className="h-8 w-8 text-text-tertiary" />
              )}
            </div>
            <div className="text-sm font-medium text-text-primary">{property.name}</div>
            <div className="mt-1 flex items-center gap-1 text-xs text-text-tertiary">
              <MapPin className="h-3 w-3" />
              {property.location}
            </div>
            <div className="mt-2 text-sm font-semibold text-text-secondary">
              {formatCLP(property.price)}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 flex justify-center">
        <button
          type="button"
          onClick={onSelect}
          className="glow-cyan rounded-xl bg-[var(--neon-cyan)]/10 border border-[var(--neon-cyan)]/50 px-8 py-4 text-base font-semibold text-text-primary transition-colors duration-200 hover:bg-[var(--neon-cyan)]/20"
        >
          Seleccionar Propuesta
        </button>
      </div>
    </div>
  )
}
