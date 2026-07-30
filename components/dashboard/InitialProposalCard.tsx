"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { AlertTriangle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { SelectableChip } from "@/components/wizard/SelectableChip"
import { MIN_QUALIFYING_UF } from "@/lib/uf-preevaluation"

interface BandResult {
  band: "1" | "1-2" | "2-3" | "3-4" | "4-5" | "5-6"
  label: string
  approvalProbability: number
}

interface UFPreEvaluation {
  maxMonthlyInstallmentCLP: number
  maxLoanUF: number
  pieUF: number
  estimatedPropertyValueUF: number
  disclaimer: string
}

type Destination = "vivir" | "airbnb" | "alquiler_tradicional" | "venta_corto_plazo"

const DESTINATION_OPTIONS: { label: string; value: Destination }[] = [
  { label: "Vivir", value: "vivir" },
  { label: "Airbnb", value: "airbnb" },
  { label: "Alquiler tradicional", value: "alquiler_tradicional" },
  { label: "Venta a corto plazo", value: "venta_corto_plazo" },
]

/**
 * Selección de propuesta inicial: el cliente YA NO ve las 6 bandas de
 * departamentos con su % de probabilidad de aprobación (eso queda para uso
 * interno del asesor en backoffice, ver lib/proposal-risk.ts) -- solo ve el
 * monto estimado en UF al que podría optar, presentado como el resultado de
 * su evaluación.
 *
 * Justo debajo, el cliente elige para qué destinará el inmueble -- YA NO se
 * pregunta en el wizard (ver lib/wizard-storage.ts v11) porque acá se cubre
 * con más contexto (ya sabe cuántas UF tiene aprobadas). Puede elegir MÁS DE
 * UNO a la vez (ej. Airbnb + Alquiler tradicional simultáneamente).
 *
 * - Si califica (>= MIN_QUALIFYING_UF), tras elegir al menos un destino el
 *   botón "Continuar" auto-selecciona la banda interna de mayor cantidad de
 *   departamentos con probabilidad >= 50% (o la banda "1" si ninguna llega a
 *   50%), guarda los destinos elegidos y avanza la solicitud.
 * - Si no califica, se muestra una tarjeta ámbar de advertencia con opción
 *   de actualizar los datos financieros -- sin avanzar de etapa.
 */
function InitialProposalCard({
  applicationId,
  onSelected,
  onQualificationChange,
}: {
  applicationId: string
  onSelected: (destinations: Destination[]) => void
  /** Notifica al padre si el cliente califica o no, para que pueda ocultar
   * el resto de la UI del dashboard (timeline, etc.) en el caso no calificado. */
  onQualificationChange?: (qualifies: boolean) => void
}) {
  const router = useRouter()
  const [bands, setBands] = React.useState<BandResult[] | null>(null)
  const [ufPreEvaluation, setUfPreEvaluation] = React.useState<UFPreEvaluation | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [destinations, setDestinations] = React.useState<Destination[]>([])

  React.useEffect(() => {
    fetch(`/api/applications/${applicationId}/proposal-bands`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setBands(data?.bands ?? [])
        setUfPreEvaluation(data?.ufPreEvaluation ?? null)
      })
      .catch(() => setBands([]))
      .finally(() => setLoading(false))
  }, [applicationId])

  const qualifies = (ufPreEvaluation?.estimatedPropertyValueUF ?? 0) >= MIN_QUALIFYING_UF

  React.useEffect(() => {
    if (!loading) onQualificationChange?.(qualifies)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, qualifies])

  function toggleDestination(value: Destination) {
    setDestinations((prev) => (prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value]))
  }

  async function handleContinue() {
    if (!bands || bands.length === 0) {
      toast.error("No pudimos calcular tu propuesta. Intenta más tarde.")
      return
    }
    if (destinations.length === 0) {
      toast.error("Selecciona al menos un destino para tu inmueble.")
      return
    }

    // El cliente nunca ve esta lógica ni el %: se auto-elige internamente la
    // banda de MAYOR cantidad de departamentos con >= 50% de probabilidad,
    // o si ninguna llega, la banda "1" (la de mayor probabilidad individual).
    const eligible = bands.filter((b) => b.approvalProbability >= 50)
    const chosen = eligible.length > 0 ? eligible[eligible.length - 1] : bands.find((b) => b.band === "1") ?? bands[0]
    const hasInvestment = destinations.some((d) => d !== "vivir")
    const purpose = hasInvestment ? "inversion" : "vivienda_propia"

    setIsSubmitting(true)
    try {
      const destRes = await fetch(`/api/applications/${applicationId}/select-destinations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destinations }),
      })
      if (!destRes.ok) {
        const data = await destRes.json().catch(() => null)
        toast.error(data?.error ?? "No se pudo guardar el destino del inmueble.")
        return
      }

      const res = await fetch(`/api/applications/${applicationId}/select-initial-proposal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ band: chosen.band, purpose }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        toast.error(data?.error ?? "No se pudo continuar con tu solicitud.")
        return
      }
      toast.success("¡Tu solicitud avanzó a la siguiente etapa!")
      onSelected(destinations)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-6">
        <p className="text-sm text-text-tertiary">Calculando tu pre-evaluación...</p>
      </div>
    )
  }

  if (!qualifies) {
    return (
      <div className="glass-card flex flex-col gap-4 rounded-2xl border border-warning/30 bg-warning/5 p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden="true" />
          <div className="flex flex-col gap-2">
            <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-text-tertiary">
              Análisis de perfil
            </h2>
            <p className="text-sm leading-relaxed text-text-primary">
              Por el momento tu perfil no califica para acceder a un inmueble según nuestra pre-evaluación.
              Mantendremos tus datos guardados para que puedas volver a evaluarte más adelante con mejor información.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          className="w-fit"
          onClick={() => router.push("/onboarding/wizard?edit=true")}
        >
          Actualizar mis datos
        </Button>
      </div>
    )
  }

  return (
    <div className="glass-card flex flex-col gap-6 rounded-2xl p-6">
      <div>
        <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-text-tertiary">
          Tu propuesta inicial
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          ¡Excelente! Has completado tu pre-evaluación. Es un resultado <strong>estimado</strong>, no una aprobación
          bancaria: queda sujeta a confirmación una vez que envíes tus documentos.
        </p>
      </div>

      {ufPreEvaluation && (
        <div className="rounded-xl border border-neon-cyan/30 bg-neon-cyan/5 p-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">Tienes aprobadas</p>
          <p className="font-heading text-4xl font-semibold text-neon-cyan sm:text-5xl">
            {Math.round(ufPreEvaluation.estimatedPropertyValueUF).toLocaleString("es-CL")} UF
          </p>
          <p className="mt-2 text-xs text-text-tertiary">{ufPreEvaluation.disclaimer}</p>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-text-primary">¿Para qué destinarás el inmueble?</h3>
        <p className="mt-1 text-xs text-text-tertiary">
          Puedes elegir más de una opción -- según lo que marques te mostraremos las propiedades más adecuadas.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {DESTINATION_OPTIONS.map((opt) => (
            <SelectableChip
              key={opt.value}
              label={opt.label}
              selected={destinations.includes(opt.value)}
              onClick={() => toggleDestination(opt.value)}
              showCheckWhenSelected
            />
          ))}
        </div>
      </div>

      <Button
        className="glow-cyan w-fit gap-2 bg-neon-cyan text-deep hover:bg-neon-cyan/90"
        disabled={isSubmitting || destinations.length === 0}
        onClick={handleContinue}
      >
        {isSubmitting ? "Guardando..." : "Continuar"}
      </Button>
    </div>
  )
}

export { InitialProposalCard }
