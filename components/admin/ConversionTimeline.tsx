import { TrendingUpIcon } from "lucide-react"

import { MOCK_TIMELINE } from "@/components/admin/types"

/**
 * Timeline de cierres — line chart vía SVG puro (sin librería externa).
 * X: día del mes. Y: cierres ese día. Incluye indicador de tendencia semanal.
 */
export function ConversionTimeline() {
  const width = 640
  const height = 180
  const padding = 24
  const maxClosures = Math.max(...MOCK_TIMELINE.map((p) => p.closures), 1)

  const points = MOCK_TIMELINE.map((p, i) => {
    const x = padding + (i / (MOCK_TIMELINE.length - 1)) * (width - padding * 2)
    const y = height - padding - (p.closures / maxClosures) * (height - padding * 2)
    return { x, y, ...p }
  })

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")
  const areaPath = `${linePath} L${points[points.length - 1].x.toFixed(1)},${height - padding} L${points[0].x.toFixed(1)},${height - padding} Z`

  const lastWeek = MOCK_TIMELINE.slice(-7).reduce((sum, p) => sum + p.closures, 0)
  const prevWeek = MOCK_TIMELINE.slice(-14, -7).reduce((sum, p) => sum + p.closures, 0)
  const trendPct = prevWeek > 0 ? (((lastWeek - prevWeek) / prevWeek) * 100).toFixed(0) : "0"
  const trendUp = Number(trendPct) >= 0

  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Timeline de conversión</h3>
          <p className="text-xs text-text-tertiary">Cierres por día — mes en curso</p>
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

      <div className="mt-4 w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-44 w-full min-w-[480px]" preserveAspectRatio="none">
          <defs>
            <linearGradient id="timelineFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--neon-cyan)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--neon-cyan)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#timelineFill)" />
          <path d={linePath} fill="none" stroke="var(--neon-cyan)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-text-tertiary">
        <span>Día 1</span>
        <span>Día {MOCK_TIMELINE.length}</span>
      </div>
    </div>
  )
}
