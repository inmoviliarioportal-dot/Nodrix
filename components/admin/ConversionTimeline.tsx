"use client"

import { useEffect, useState } from "react"
import { TrendingUpIcon } from "lucide-react"

export interface TimelinePointData {
  day: number
  closures: number
}

/**
 * Timeline de cierres -- line chart vía SVG puro (sin librería externa).
 * X: día del mes en curso. Y: cierres reales ese día (ver GET /api/admin/kpis,
 * calculado desde application_stage_history donde to_stage = 'CIERRE').
 */
export function ConversionTimeline({ timeline }: { timeline: TimelinePointData[] }) {
  const width = 640
  const height = 180
  const padding = 24
  const maxClosures = Math.max(...timeline.map((p) => p.closures), 1)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const points = timeline.map((p, i) => {
    const x = padding + (i / Math.max(1, timeline.length - 1)) * (width - padding * 2)
    const y = height - padding - (p.closures / maxClosures) * (height - padding * 2)
    return { x, y, ...p }
  })

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")
  const areaPath =
    points.length > 0
      ? `${linePath} L${points[points.length - 1].x.toFixed(1)},${height - padding} L${points[0].x.toFixed(1)},${height - padding} Z`
      : ""

  const totalClosures = timeline.reduce((sum, p) => sum + p.closures, 0)
  const lastWeek = timeline.slice(-7).reduce((sum, p) => sum + p.closures, 0)
  const prevWeek = timeline.slice(-14, -7).reduce((sum, p) => sum + p.closures, 0)
  const trendPct = prevWeek > 0 ? (((lastWeek - prevWeek) / prevWeek) * 100).toFixed(0) : "0"
  const trendUp = Number(trendPct) >= 0

  return (
    <div className="glass-card animate-fade-in rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Timeline de cierres</h3>
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

      <div className="mt-4 w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-44 w-full min-w-[480px]" preserveAspectRatio="none">
          <defs>
            <linearGradient id="timelineFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--neon-cyan)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--neon-cyan)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d={areaPath}
            fill="url(#timelineFill)"
            style={{
              opacity: mounted ? 1 : 0,
              transition: "opacity 400ms ease-out",
            }}
          />
          <path
            d={linePath}
            fill="none"
            stroke="var(--neon-cyan)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "scaleY(1)" : "scaleY(0.85)",
              transformOrigin: "bottom",
              transition: "opacity 400ms ease-out, transform 400ms ease-out",
            }}
          />
        </svg>
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-text-tertiary">
        <span>Día 1</span>
        <span>Día {timeline.length}</span>
      </div>
    </div>
  )
}
