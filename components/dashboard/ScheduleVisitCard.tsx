"use client"

import * as React from "react"
import { toast } from "sonner"
import { MapPin, CalendarCheck } from "lucide-react"

import { Button } from "@/components/ui/button"

interface SelectedProperty {
  id: string
  name: string
  comuna: string
  location: string
  image: string | null
}

/**
 * Agendamiento de visita a las propiedades/proyectos que el cliente YA
 * eligió durante el flujo de propuestas (inversión y/o vivienda propia).
 * Se muestra junto a `DocumentsCard` en DOCUMENTOS_PENDIENTES para que el
 * cliente pueda subir documentos Y agendar su visita en la misma vista,
 * en paralelo (no una etapa detrás de la otra).
 */
function ScheduleVisitCard({ applicationId }: { applicationId: string }) {
  const [properties, setProperties] = React.useState<SelectedProperty[] | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [selectedComuna, setSelectedComuna] = React.useState<string | null>(null)
  const [scheduledAt, setScheduledAt] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [scheduled, setScheduled] = React.useState(false)

  React.useEffect(() => {
    fetch(`/api/applications/${applicationId}/selected-properties`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setProperties(data?.properties ?? []))
      .catch(() => setProperties([]))
      .finally(() => setLoading(false))
  }, [applicationId])

  const distinctComunas = React.useMemo(
    () => Array.from(new Set((properties ?? []).map((p) => p.comuna))),
    [properties]
  )

  async function handleSchedule() {
    const comuna = selectedComuna ?? distinctComunas[0]
    if (!comuna || !scheduledAt) return
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, comuna, scheduledAt: new Date(scheduledAt).toISOString() }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        toast.error(data?.error ?? "No se pudo agendar la visita.")
        return
      }
      toast.success("Visita agendada. Tu asesor la confirmará contigo.")
      setScheduled(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-6">
        <p className="text-sm text-text-tertiary">Cargando tus propiedades elegidas...</p>
      </div>
    )
  }

  // Sin propuesta aceptada todavía (no debería pasar en el flujo normal,
  // pero evita romper la UI si el cliente llega acá sin haber pasado por
  // /onboarding/initial-proposal) -- no bloquea nada, simplemente no
  // muestra la tarjeta.
  if (!properties || properties.length === 0) return null

  return (
    <div className="glass-card flex flex-col gap-4 rounded-2xl p-6">
      <div>
        <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-text-tertiary">
          Agenda tu visita
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Conoce en persona los proyectos que elegiste. Puedes agendar mientras subes tus documentos, no hace falta
          esperar.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {properties.map((property) => (
          <span
            key={property.id}
            className="inline-flex items-center gap-1.5 rounded-full border border-glass-border bg-surface-elevated px-3 py-1.5 text-xs text-text-secondary"
          >
            <MapPin className="size-3 text-neon-cyan" />
            {property.name} · {property.comuna}
          </span>
        ))}
      </div>

      {scheduled ? (
        <p className="flex items-center gap-1.5 text-sm font-medium text-neon-green">
          <CalendarCheck className="size-4" />
          Visita agendada. Tu asesor la confirmará contigo.
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {distinctComunas.length > 1 && (
            <select
              value={selectedComuna ?? distinctComunas[0]}
              onChange={(e) => setSelectedComuna(e.target.value)}
              className="h-9 rounded-md border border-glass-border bg-deep px-2 text-xs text-text-primary outline-none"
            >
              {distinctComunas.map((comuna) => (
                <option key={comuna} value={comuna}>
                  {comuna}
                </option>
              ))}
            </select>
          )}
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="h-9 rounded-md border border-glass-border bg-deep px-2 text-xs text-text-primary outline-none"
          />
          <Button size="sm" disabled={!scheduledAt || isSubmitting} onClick={handleSchedule} className="gap-1.5">
            <CalendarCheck className="size-3.5" />
            {isSubmitting ? "Agendando..." : "Agendar visita"}
          </Button>
        </div>
      )}
    </div>
  )
}

export { ScheduleVisitCard }
