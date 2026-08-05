"use client"

import { useEffect, useState } from "react"

import { STAGE_LABELS } from "@/components/dashboard/types"

export interface FunnelStageData {
  stage: string
  count: number
}

/**
 * Funnel de conversión -- barras horizontales, una por etapa del pipeline.
 * `funnel[i].count` es ACUMULATIVO: cuántas solicitudes alguna vez
 * alcanzaron esa etapa (ver GET /api/admin/kpis), no solo las que están
 * ahí ahora mismo.
 */
export function ConversionFunnel({ funnel }: { funnel: FunnelStageData[] }) {
  const maxCount = funnel[0]?.count ?? 1
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div className="glass-surface animate-fade-in rounded-2xl p-5">
      <h2 className="text-xs font-bold uppercase tracking-wide text-text-tertiary">
        Funnel de conversión
      </h2>

      <div className="mt-3.5 flex flex-col gap-2.5">
        {funnel.map((stage) => {
          const widthPct = Math.max(4, (stage.count / maxCount) * 100)
          const label = STAGE_LABELS[stage.stage] ?? stage.stage

          return (
            <div key={stage.stage}>
              <div className="mb-1 flex items-center justify-between text-xs text-text-secondary">
                <span className="truncate" title={label}>
                  {label}
                </span>
                <span
                  className="font-heading font-semibold text-text-primary"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {stage.count}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-dark-tertiary">
                <div
                  className="h-full rounded-full bg-neon-cyan transition-all duration-300 ease-out"
                  style={{ width: mounted ? `${widthPct}%` : "0%" }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
