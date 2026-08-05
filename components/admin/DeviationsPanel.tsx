"use client"

import Link from "next/link"
import { AlertTriangleIcon } from "lucide-react"

import { STAGE_LABELS } from "@/components/dashboard/types"

export interface DeviationData {
  id: string
  client: string
  stage: string
  daysInStage: number
  expectedDays: number
  overByPct: number
}

/**
 * Desviaciones de proceso: solicitudes activas cuyo tiempo en su etapa
 * actual supera 1.5x el promedio HISTÓRICO real para esa etapa (calculado
 * del propio historial de transiciones, ver GET /api/admin/kpis) -- no un
 * umbral inventado. Son los casos que más se están saliendo del proceso
 * normal y probablemente necesitan intervención del asesor/gerencia.
 */
export function DeviationsPanel({ deviations }: { deviations: DeviationData[] }) {
  return (
    <div className="glass-card animate-fade-in rounded-2xl p-5">
      <div className="flex items-center gap-2">
        <AlertTriangleIcon className="size-4 text-gold" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-text-primary">Desviaciones de proceso</h3>
      </div>
      <p className="text-xs text-text-tertiary">
        Solicitudes que llevan significativamente más tiempo del habitual en su etapa actual
      </p>

      {deviations.length === 0 ? (
        <p className="mt-4 text-sm text-text-tertiary">
          Ninguna solicitud activa se está desviando del tiempo esperado por etapa. 👍
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          {deviations.map((d) => (
            <Link
              key={d.id}
              href={`/backoffice/${d.id}`}
              className="interactive-lift flex items-center justify-between gap-3 rounded-lg border border-gold/20 bg-gold/5 px-3 py-2.5 transition-colors duration-200 hover:bg-gold/10"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text-primary">{d.client}</p>
                <p className="text-xs text-text-tertiary">{STAGE_LABELS[d.stage] ?? d.stage}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-heading text-sm font-semibold text-gold" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {d.daysInStage}d
                </p>
                <p className="text-[11px] text-text-tertiary">esperado ~{d.expectedDays}d (+{d.overByPct}%)</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
