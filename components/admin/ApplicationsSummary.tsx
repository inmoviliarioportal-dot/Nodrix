"use client"

import * as React from "react"
import Link from "next/link"

import { STAGE_LABELS } from "@/components/dashboard/types"

const STAGE_ORDER = [
  "RECEPCIONADA",
  "SCORING_COMPLETADO",
  "DOCUMENTOS_PENDIENTES",
  "DOCUMENTOS_APROBADOS",
  "PRE_EVALUACION_COMPLETADA",
  "VISITA_COMPLETADA",
  "ENVIADO_A_BANCO",
  "ESCRITURACION_AGENDADA",
  "CIERRE",
]

const CATEGORY_ORDER = ["BRONCE", "PLATA", "ORO", "PLATINO", "BLACK"]

const CATEGORY_COLOR: Record<string, string> = {
  BRONCE: "text-[#c99b66]",
  PLATA: "text-[#d1d1d1]",
  ORO: "text-gold",
  PLATINO: "text-white",
  BLACK: "text-neon-purple",
}

interface SummaryData {
  total: number
  byStage: Record<string, number>
  byCategory: Record<string, number>
}

/**
 * "Solicitudes en curso" — datos REALES (no mock, a diferencia del resto del
 * dashboard) agrupados por estado y por categoría de scoring. Cada número es
 * clickeable: lleva a /backoffice/queue ya filtrado por ese estado/categoría
 * (drilldown), en vez de tener que buscarlo manualmente.
 */
function ApplicationsSummary() {
  const [data, setData] = React.useState<SummaryData | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    fetch("/api/admin/applications-summary")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => setData(json))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="glass-surface rounded-2xl p-5">
      <div className="mb-3.5 flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wide text-text-tertiary">
          Solicitudes en curso, por estado
        </h2>
        {data && (
          <span className="text-xs text-text-tertiary">
            {data.total} solicitudes en total — datos reales
          </span>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-text-tertiary">Cargando...</p>
      ) : !data ? (
        <p className="text-sm text-error">No se pudo cargar el resumen.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="flex flex-col">
            {STAGE_ORDER.map((stage) => (
              <div
                key={stage}
                className="flex items-center justify-between border-b border-border py-2.5 last:border-0"
              >
                <span className="text-[12.5px] text-text-secondary">{STAGE_LABELS[stage] ?? stage}</span>
                <Link
                  href={`/backoffice/queue?stage=${stage}`}
                  className="text-[12.5px] font-bold text-neon-cyan hover:underline"
                >
                  {data.byStage[stage] ?? 0}
                </Link>
              </div>
            ))}
          </div>

          <div className="flex flex-col">
            <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
              Por scoring
            </h3>
            {CATEGORY_ORDER.map((category) => (
              <div
                key={category}
                className="flex items-center justify-between border-b border-border py-2.5 last:border-0"
              >
                <span className={`text-[12.5px] font-semibold ${CATEGORY_COLOR[category]}`}>{category}</span>
                <Link
                  href={`/backoffice/queue?category=${category}`}
                  className="text-[12.5px] font-bold text-neon-cyan hover:underline"
                >
                  {data.byCategory[category] ?? 0}
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export { ApplicationsSummary }
