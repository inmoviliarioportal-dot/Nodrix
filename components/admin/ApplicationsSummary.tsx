"use client"

import * as React from "react"
import Link from "next/link"

import { STAGE_LABELS } from "@/components/dashboard/types"
import { InfoTooltip } from "@/components/admin/InfoTooltip"

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
    <div className="glass-surface animate-fade-in rounded-2xl p-5">
      <div className="mb-3.5 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-text-tertiary">
          Solicitudes en curso, por estado
          <InfoTooltip
            what="Todas las solicitudes en el sistema, agrupadas por su etapa actual y por su categoría de scoring. Cada número lleva al listado filtrado correspondiente."
            how="Cuenta el stage y scoring_category actuales de cada solicitud (no histórico acumulativo, a diferencia del Funnel de Estados)."
          />
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
            {STAGE_ORDER.map((stage, index) => (
              <div
                key={stage}
                className="animate-fade-in-up flex items-center justify-between border-b border-border py-2.5 transition-colors duration-200 last:border-0 hover:bg-surface-elevated/40"
                style={{ "--animate-delay": `${index * 40}ms` } as React.CSSProperties}
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
            {CATEGORY_ORDER.map((category, index) => (
              <div
                key={category}
                className="animate-fade-in-up flex items-center justify-between border-b border-border py-2.5 transition-colors duration-200 last:border-0 hover:bg-surface-elevated/40"
                style={{ "--animate-delay": `${index * 40}ms` } as React.CSSProperties}
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
