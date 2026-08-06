"use client"

import { TrendingUpIcon } from "lucide-react"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { InfoTooltip } from "@/components/admin/InfoTooltip"

export interface TimelinePointData {
  day: number
  closures: number
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: TimelinePointData }[] }) {
  if (!active || !payload?.length) return null
  const { day, closures } = payload[0].payload
  return (
    <div className="glass-surface rounded-lg border border-glass-border px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-text-primary">Día {day}</p>
      <p className="text-text-tertiary">
        <span className="font-heading font-semibold text-neon-cyan">{closures}</span> cierres
      </p>
    </div>
  )
}

/**
 * Timeline de cierres -- area chart vía Recharts. X: día del mes en curso.
 * Y: cierres reales ese día (ver GET /api/admin/kpis, calculado desde
 * application_stage_history donde to_stage = 'CIERRE').
 */
export function ConversionTimeline({ timeline }: { timeline: TimelinePointData[] }) {
  const totalClosures = timeline.reduce((sum, p) => sum + p.closures, 0)
  const lastWeek = timeline.slice(-7).reduce((sum, p) => sum + p.closures, 0)
  const prevWeek = timeline.slice(-14, -7).reduce((sum, p) => sum + p.closures, 0)
  const trendPct = prevWeek > 0 ? (((lastWeek - prevWeek) / prevWeek) * 100).toFixed(0) : "0"
  const trendUp = Number(trendPct) >= 0

  return (
    <div className="glass-card animate-fade-in rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-text-primary">
            Timeline de cierres
            <InfoTooltip
              what="Cuántas solicitudes llegaron a Cierre cada día del mes en curso, y si la última semana fue mejor o peor que la anterior."
              how="Cuenta filas de application_stage_history donde to_stage = 'CIERRE', agrupadas por día. La tendencia compara la suma de los últimos 7 días contra los 7 días previos."
            />
          </h3>
          <p className="text-xs text-text-tertiary">{totalClosures} cierres — mes en curso</p>
        </div>
        <div
          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
            trendUp ? "bg-neon-green/10 text-neon-green" : "bg-error/10 text-error"
          }`}
        >
          <TrendingUpIcon className={`size-3.5 ${trendUp ? "" : "rotate-180"}`} />
          {trendUp ? "+" : ""}
          {trendPct}% semanal
        </div>
      </div>

      <div className="mt-4 h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={timeline} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="timelineFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--neon-cyan)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--neon-cyan)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" opacity={0.4} />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--text-tertiary)", fontSize: 10.5 }}
              interval="preserveStartEnd"
            />
            <YAxis hide domain={[0, "dataMax"]} allowDecimals={false} />
            <Tooltip cursor={{ stroke: "var(--neon-cyan)", strokeOpacity: 0.3 }} content={<ChartTooltip />} />
            <Area
              type="monotone"
              dataKey="closures"
              stroke="var(--neon-cyan)"
              strokeWidth={2}
              fill="url(#timelineFill)"
              isAnimationActive
              animationDuration={600}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
