"use client"

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"

import { InfoTooltip } from "@/components/admin/InfoTooltip"

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

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: ScoringDistributionData }[] }) {
  if (!active || !payload?.length) return null
  const { category, count, percentage } = payload[0].payload
  return (
    <div className="glass-surface rounded-lg border border-glass-border px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-text-primary">{CATEGORY_LABELS[category] ?? category}</p>
      <p className="text-text-tertiary">
        <span className="font-heading font-semibold text-text-primary">{percentage}%</span> · {count} solicitudes
      </p>
    </div>
  )
}

/**
 * Distribución de scoring -- donut chart vía Recharts + leyenda compacta con
 * cifras exactas al lado. Data REAL (ver GET /api/admin/kpis) calculada
 * sobre todas las solicitudes con scoring_category asignado.
 */
export function ScoringDistribution({ distribution }: { distribution: ScoringDistributionData[] }) {
  const hasData = distribution.some((d) => d.count > 0)

  return (
    <div className="glass-surface animate-fade-in rounded-2xl p-5">
      <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-text-tertiary">
        Por categoría de scoring
        <InfoTooltip
          what="Cómo se reparten las solicitudes según su categoría de riesgo/capacidad financiera (Bronce a Black)."
          how="% y conteo de solicitudes por scoring_category, sobre el total de solicitudes que YA tienen un scoring calculado (excluye las que aún no pasaron por el motor de scoring)."
        />
      </h2>

      <div className="mt-3 flex items-center gap-4">
        <div className="h-[140px] w-[140px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={distribution}
                dataKey="count"
                nameKey="category"
                innerRadius={42}
                outerRadius={64}
                paddingAngle={hasData ? 3 : 0}
                stroke="none"
                isAnimationActive
                animationDuration={600}
              >
                {distribution.map((entry) => (
                  <Cell
                    key={entry.category}
                    fill={CATEGORY_COLORS[entry.category] ?? "var(--text-tertiary)"}
                    fillOpacity={entry.count > 0 ? 1 : 0.15}
                  />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          {distribution.map((item) => (
            <div key={item.category} className="flex items-center justify-between gap-2 text-xs">
              <span className="flex min-w-0 items-center gap-1.5 font-semibold text-text-secondary">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: CATEGORY_COLORS[item.category] ?? "var(--text-tertiary)" }}
                  aria-hidden="true"
                />
                <span className="truncate">{CATEGORY_LABELS[item.category] ?? item.category}</span>
              </span>
              <span className="flex shrink-0 items-baseline gap-1">
                <span
                  className="font-heading text-[12px] font-semibold text-text-primary"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {item.percentage}%
                </span>
                <span className="text-[10.5px] text-text-tertiary">({item.count})</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
