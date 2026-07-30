"use client"

import { useEffect, useState } from "react"

import { MOCK_FUNNEL } from "@/components/admin/types"

/**
 * Funnel de conversión — barras horizontales de progreso, una por etapa del
 * pipeline. Label + conteo arriba de cada barra, ancho proporcional al
 * conteo relativo a la primera etapa. Acento único (cyan), sin degradé
 * multicolor compitiendo con el resto del dashboard.
 */
export function ConversionFunnel() {
  const maxCount = MOCK_FUNNEL[0]?.count ?? 1
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
        {MOCK_FUNNEL.map((stage) => {
          const widthPct = Math.max(4, (stage.count / maxCount) * 100)

          return (
            <div key={stage.stage}>
              <div className="mb-1 flex items-center justify-between text-xs text-text-secondary">
                <span className="truncate" title={stage.label}>
                  {stage.label}
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
