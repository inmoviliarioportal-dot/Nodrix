"use client"

import * as React from "react"
import { TrendingUp } from "lucide-react"

export interface PreEvaluationCardProps {
  applicationId: string
  /** Solicitud y cliente YA cargados por el panel. Si vienen, esta tarjeta
   * no vuelve a pedir `/api/applications/[id]` -- ese request duplicaba uno
   * que el dashboard ya había hecho y sumaba latencia sin aportar datos
   * nuevos. Se dejan opcionales para no romper otros usos del componente. */
  application?: Record<string, any> | null
  customer?: Record<string, any> | null
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
function PreEvaluationCard({
  applicationId,
  application: applicationProp,
  customer: customerProp,
}: PreEvaluationCardProps) {
  const [approvedUf, setApprovedUf] = React.useState<number | null>(null)
  const [breakdown, setBreakdown] = React.useState<string[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let cancelled = false
    // El detalle solo se pide si el padre no lo pasó (ver props).
    const hasDetailFromProps = Boolean(applicationProp)
    Promise.all([
      fetch(`/api/applications/${applicationId}/proposal-bands`).then((res) => (res.ok ? res.json() : null)),
      hasDetailFromProps
        ? Promise.resolve({ application: applicationProp, customer: customerProp ?? null })
        : fetch(`/api/applications/${applicationId}`).then((res) => (res.ok ? res.json() : null)),
    ])
      .then(([bands, detail]) => {
        if (cancelled) return
        const uf = bands?.ufPreEvaluation?.estimatedPropertyValueUF
        setApprovedUf(typeof uf === "number" ? uf : null)

        const application = detail?.application
        const destinationsArr = (detail?.customer?.property_destinations as string[] | null | undefined) ?? null
        const destinationSingle = detail?.customer?.property_destination as string | null | undefined
        const investmentDestinations = (destinationsArr ?? (destinationSingle ? [destinationSingle] : [])).filter(
          (d) => d !== "vivir"
        )
        const items: string[] = []
        const investmentCount: number = application?.selected_property_ids?.length ?? 0
        if (investmentCount > 0) {
          const label =
            investmentDestinations.length > 0
              ? investmentDestinations.map((d) => DESTINATION_LABELS[d] ?? d).join(" + ")
              : "inversión"
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
  }, [applicationId, applicationProp, customerProp])

  return (
    <div className="glass-card relative flex h-full min-h-[168px] items-start gap-3 overflow-hidden rounded-2xl p-5">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-dark-tertiary text-neon-cyan">
        <TrendingUp className="size-5" aria-hidden="true" />
      </span>
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="text-[10.5px] font-bold uppercase tracking-wide text-text-tertiary">
          Pre-evaluación
        </span>
        {loading ? (
          <p className="text-[12px] text-text-tertiary">Cargando...</p>
        ) : (
          <>
            <p className="font-heading text-2xl leading-snug font-semibold text-text-primary">
              {approvedUf != null
                ? `${Math.round(approvedUf).toLocaleString("es-CL")} UF aprobadas`
                : "Pendiente revisión."}
            </p>
            {breakdown.length > 0 && (
              <p className="text-[13px] leading-relaxed text-text-secondary">Optas a: {breakdown.join(", ")}</p>
            )}
            <p className="mt-1 text-[12px] leading-relaxed text-text-tertiary">
              Este monto es referencial y se confirmará una vez que el banco revise tus documentos.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

export { PreEvaluationCard }
