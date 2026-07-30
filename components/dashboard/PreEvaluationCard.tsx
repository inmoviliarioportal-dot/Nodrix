"use client"

import * as React from "react"
import { TrendingUp } from "lucide-react"

export interface PreEvaluationCardProps {
  applicationId: string
}

/** Mismos 4 valores EXACTOS que WizardPropertyDestination (lib/wizard-storage.ts). */
const DESTINATION_LABELS: Record<string, string> = {
  vivir: "vivienda",
  airbnb: "airbnb",
  alquiler_tradicional: "alquiler tradicional",
  venta_corto_plazo: "venta a corto plazo",
}

/**
 * Tile de pre-evaluación: muestra las UF aprobadas (crédito teórico +
 * ahorro, ver lib/uf-preevaluation.ts -- nunca descontado por la
 * probabilidad interna) y, si el cliente ya aceptó propiedades, un resumen
 * de cuántas y de qué tipo (destino declarado en el wizard para las de
 * inversión, "vivienda" para la de vivienda propia).
 */
function PreEvaluationCard({ applicationId }: PreEvaluationCardProps) {
  const [approvedUf, setApprovedUf] = React.useState<number | null>(null)
  const [breakdown, setBreakdown] = React.useState<string[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch(`/api/applications/${applicationId}/proposal-bands`).then((res) => (res.ok ? res.json() : null)),
      fetch(`/api/applications/${applicationId}`).then((res) => (res.ok ? res.json() : null)),
    ])
      .then(([bands, detail]) => {
        if (cancelled) return
        const uf = bands?.ufPreEvaluation?.estimatedPropertyValueUF
        setApprovedUf(typeof uf === "number" ? uf : null)

        const application = detail?.application
        const destination = detail?.customer?.property_destination as string | null | undefined
        const items: string[] = []
        const investmentCount: number = application?.selected_property_ids?.length ?? 0
        if (investmentCount > 0) {
          const label = destination ? (DESTINATION_LABELS[destination] ?? destination) : "inversión"
          items.push(`${investmentCount} ${label}`)
        }
        if (application?.accepted_housing_property_id) {
          items.push("1 vivienda")
        }
        setBreakdown(items)
      })
      .catch(() => {
        if (!cancelled) {
          setApprovedUf(null)
          setBreakdown([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [applicationId])

  return (
    <div className="glass-card flex flex-col gap-1.5 rounded-xl p-3">
      <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-text-tertiary">
        <TrendingUp className="size-3.5 text-neon-cyan" aria-hidden="true" />
        Pre-evaluación
      </span>
      {loading ? (
        <p className="text-[12px] text-text-tertiary">Cargando...</p>
      ) : (
        <>
          <p className="font-heading text-[13px] leading-snug text-text-primary">
            {approvedUf != null
              ? `${Math.round(approvedUf).toLocaleString("es-CL")} UF aprobadas`
              : "Pendiente revisión."}
          </p>
          {breakdown.length > 0 && (
            <p className="line-clamp-2 text-[12px] leading-snug text-text-secondary">
              Optas a: {breakdown.join(", ")}
            </p>
          )}
        </>
      )}
    </div>
  )
}

export { PreEvaluationCard }
