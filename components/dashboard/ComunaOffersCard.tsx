"use client"

import * as React from "react"
import { toast } from "sonner"
import { MapPin, CalendarCheck } from "lucide-react"

import { Button } from "@/components/ui/button"

interface ComunaOffer {
  comuna: string
  investment: { minUf: number; maxUf: number } | null
  housing: { minUf: number; maxUf: number } | null
  referenceImage: string | null
  floorPlanUrl: string | null
  sampleReferencePropertyId: string
}

function formatUf(range: { minUf: number; maxUf: number }): string {
  if (range.minUf === range.maxUf) return `${range.minUf} UF`
  return `${range.minUf} - ${range.maxUf} UF`
}

/**
 * Oferta por comuna para la etapa "Aprobado previo" (PRE_EVALUACION_COMPLETADA):
 * el cliente NO ve un listado de propiedades específicas para elegir por
 * foto -- ve valores agregados por comuna (rango UF para inversión y para
 * vivienda propia) con UNA imagen referencial del tipo de proyecto, y agenda
 * una visita para conocer el proyecto real en persona. Ver
 * GET /api/properties/offers (agregación) y POST /api/visits (agendamiento).
 */
function ComunaOffersCard({ applicationId }: { applicationId: string }) {
  const [offers, setOffers] = React.useState<ComunaOffer[] | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [selectedComuna, setSelectedComuna] = React.useState<string | null>(null)
  const [scheduledAt, setScheduledAt] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [scheduledComuna, setScheduledComuna] = React.useState<string | null>(null)

  React.useEffect(() => {
    fetch("/api/properties/offers")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setOffers(data?.offers ?? []))
      .catch(() => setOffers([]))
      .finally(() => setLoading(false))
  }, [])

  async function handleSchedule() {
    if (!selectedComuna || !scheduledAt) return
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          comuna: selectedComuna,
          scheduledAt: new Date(scheduledAt).toISOString(),
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        toast.error(data?.error ?? "No se pudo agendar la visita.")
        return
      }
      toast.success(`Visita agendada en ${selectedComuna}. Tu asesor la confirmará.`)
      setScheduledComuna(selectedComuna)
      setSelectedComuna(null)
      setScheduledAt("")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-6">
        <p className="text-sm text-text-tertiary">Cargando oferta disponible...</p>
      </div>
    )
  }

  if (!offers || offers.length === 0) {
    return null
  }

  return (
    <div className="glass-card flex flex-col gap-5 rounded-2xl p-6">
      <div>
        <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-text-tertiary">
          Tu oferta por comuna
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Estos son valores referenciales según tu pre-evaluación. Las imágenes son ilustrativas del tipo de
          proyecto -- agenda una visita para conocer el proyecto real en persona.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {offers.map((offer) => (
          <div
            key={offer.comuna}
            className="flex flex-col overflow-hidden rounded-xl border border-glass-border bg-surface-elevated"
          >
            {offer.referenceImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={offer.referenceImage}
                alt={`Imagen referencial de proyectos en ${offer.comuna}`}
                className="h-32 w-full object-cover"
              />
            )}
            <div className="flex flex-col gap-2 p-4">
              <p className="flex items-center gap-1.5 text-sm font-medium text-text-primary">
                <MapPin className="size-3.5 text-neon-cyan" />
                {offer.comuna}
              </p>
              {offer.investment && (
                <p className="text-xs text-text-secondary">
                  Inversión: <span className="font-medium text-text-primary">{formatUf(offer.investment)}</span>
                </p>
              )}
              {offer.housing && (
                <p className="text-xs text-text-secondary">
                  Vivienda propia:{" "}
                  <span className="font-medium text-text-primary">{formatUf(offer.housing)}</span>
                </p>
              )}
              <Button
                size="sm"
                variant="outline"
                className="mt-1 gap-1.5"
                disabled={scheduledComuna === offer.comuna}
                onClick={() => setSelectedComuna(offer.comuna)}
              >
                <CalendarCheck className="size-3.5" />
                {scheduledComuna === offer.comuna ? "Visita agendada" : "Agendar visita"}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {selectedComuna && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-glass-border bg-surface-elevated p-3">
          <span className="text-xs text-text-secondary">Fecha y hora de visita en {selectedComuna}:</span>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="h-8 rounded-md border border-glass-border bg-deep px-2 text-xs text-text-primary outline-none"
          />
          <Button size="sm" disabled={!scheduledAt || isSubmitting} onClick={handleSchedule}>
            {isSubmitting ? "Agendando..." : "Confirmar"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedComuna(null)}>
            Cancelar
          </Button>
        </div>
      )}
    </div>
  )
}

export { ComunaOffersCard }
