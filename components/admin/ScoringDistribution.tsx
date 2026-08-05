const CATEGORY_LABELS: Record<string, string> = {
  BRONCE: "Bronce",
  PLATA: "Plata",
  ORO: "Oro",
  PLATINO: "Platino",
  BLACK: "Black",
}

const CATEGORY_COLORS: Record<string, string> = {
  BRONCE: "var(--bronce)",
  PLATA: "var(--plata)",
  ORO: "var(--oro)",
  PLATINO: "var(--platino)",
  BLACK: "var(--neon-purple)",
}

export interface ScoringDistributionData {
  category: string
  count: number
  percentage: number
}

/**
 * Distribución de scoring -- filas compactas por categoría, data REAL (ver
 * GET /api/admin/kpis) calculada sobre todas las solicitudes con
 * scoring_category asignado.
 */
export function ScoringDistribution({ distribution }: { distribution: ScoringDistributionData[] }) {
  return (
    <div className="glass-surface animate-fade-in rounded-2xl p-5">
      <h2 className="text-xs font-bold uppercase tracking-wide text-text-tertiary">
        Por categoría de scoring
      </h2>

      <div className="mt-3.5 flex flex-col gap-2">
        {distribution.map((item, index) => (
          <div
            key={item.category}
            className="animate-fade-in-up flex items-center justify-between rounded-lg bg-deep px-2.5 py-2"
            style={{ "--animate-delay": `${index * 60}ms` } as React.CSSProperties}
          >
            <span className="flex items-center gap-2 text-xs font-semibold text-text-secondary">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: CATEGORY_COLORS[item.category] ?? "var(--text-tertiary)" }}
                aria-hidden="true"
              />
              {CATEGORY_LABELS[item.category] ?? item.category}
            </span>
            <span className="flex items-baseline gap-1.5">
              <span
                className="font-heading text-[13px] font-semibold text-text-primary"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {item.percentage}%
              </span>
              <span className="text-[11px] text-text-tertiary">({item.count})</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
