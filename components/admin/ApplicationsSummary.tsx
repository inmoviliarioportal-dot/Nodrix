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
 * "Solicitudes en curso" — tabla con datos REALES (no mock, a diferencia
 * del resto del dashboard) agrupados por estado y por categoría de scoring.
 * Cada número es clickeable: lleva a /backoffice/queue ya filtrado por ese
 * estado/categoría (drilldown), en vez de tener que buscarlo manualmente.
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
    <div className="glass-card rounded-2xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-text-tertiary">
          Solicitudes en curso
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
          <div>
            <h3 className="mb-2 text-xs font-medium text-text-tertiary">Por estado</h3>
            <table className="w-full border-collapse text-sm">
              <tbody>
                {STAGE_ORDER.map((stage) => (
                  <tr key={stage} className="border-b border-glass-border/50">
                    <td className="py-1.5 text-text-secondary">{STAGE_LABELS[stage] ?? stage}</td>
                    <td className="py-1.5 text-right">
                      <Link
                        href={`/backoffice/queue?stage=${stage}`}
                        className="font-semibold text-neon-cyan hover:underline"
                      >
                        {data.byStage[stage] ?? 0}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <h3 className="mb-2 text-xs font-medium text-text-tertiary">Por scoring</h3>
            <table className="w-full border-collapse text-sm">
              <tbody>
                {CATEGORY_ORDER.map((category) => (
                  <tr key={category} className="border-b border-glass-border/50">
                    <td className={`py-1.5 font-medium ${CATEGORY_COLOR[category]}`}>{category}</td>
                    <td className="py-1.5 text-right">
                      <Link
                        href={`/backoffice/queue?category=${category}`}
                        className="font-semibold text-neon-cyan hover:underline"
                      >
                        {data.byCategory[category] ?? 0}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export { ApplicationsSummary }
