"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { AlertTriangle } from "lucide-react"

import { Button } from "@/components/ui/button"
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

/**
 * Selección de propuesta inicial: el cliente YA NO ve las 6 bandas de
 * departamentos con su % de probabilidad de aprobación (eso queda para uso
 * interno del asesor en backoffice, ver lib/proposal-risk.ts) -- solo ve el
 * monto estimado en UF al que podría optar.
 *
 * - Si califica (>= MIN_QUALIFYING_UF), un botón "Continuar" auto-selecciona
 *   la banda interna de mayor cantidad de departamentos con probabilidad
 *   >= 50% (o la banda "1" si ninguna llega a 50%) y avanza la solicitud.
 * - Si no califica, se muestra una tarjeta ámbar de advertencia con opción
 *   de actualizar los datos financieros -- sin avanzar de etapa.
 */
function InitialProposalCard({
  applicationId,
  onSelected,
  onQualificationChange,
}: {
  applicationId: string
  onSelected: (registeredPurpose: string | null) => void
  /** Notifica al padre si el cliente califica o no, para que pueda ocultar
   * el resto de la UI del dashboard (timeline, etc.) en el caso no calificado. */
  onQualificationChange?: (qualifies: boolean) => void
}) {
  const router = useRouter()
  const [bands, setBands] = React.useState<BandResult[] | null>(null)
  const [ufPreEvaluation, setUfPreEvaluation] = React.useState<UFPreEvaluation | null>(null)
  const [registeredPurpose, setRegisteredPurpose] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  React.useEffect(() => {
    fetch(`/api/applications/${applicationId}/proposal-bands`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setBands(data?.bands ?? [])
        setUfPreEvaluation(data?.ufPreEvaluation ?? null)
        setRegisteredPurpose(data?.registeredPurpose ?? null)
      })
      .catch(() => setBands([]))
      .finally(() => setLoading(false))
  }, [applicationId])

  const qualifies = (ufPreEvaluation?.estimatedPropertyValueUF ?? 0) >= MIN_QUALIFYING_UF

  React.useEffect(() => {
    if (!loading) onQualificationChange?.(qualifies)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, qualifies])

  async function handleContinue() {
    if (!bands || bands.length === 0) {
      toast.error("No pudimos calcular tu propuesta. Intenta más tarde.")
      return
    }

    // El cliente nunca ve esta lógica ni el %: se auto-elige internamente la
    // banda de MAYOR cantidad de departamentos con >= 50% de probabilidad,
    // o si ninguna llega, la banda "1" (la de mayor probabilidad individual).
    const eligible = bands.filter((b) => b.approvalProbability >= 50)
    const chosen = eligible.length > 0 ? eligible[eligible.length - 1] : bands.find((b) => b.band === "1") ?? bands[0]
    const purpose = registeredPurpose === "vivienda_propia" ? "vivienda_propia" : "inversion"

    setIsSubmitting(true)
    try {
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
      onSelected(registeredPurpose)
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
    <div className="glass-card flex flex-col gap-5 rounded-2xl p-6">
      <div>
        <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-text-tertiary">
          Tu propuesta inicial
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Según tu perfil, este es el monto estimado al que podrías optar. Es una <strong>pre-evaluación</strong>, no
          una aprobación bancaria: queda sujeta a confirmación una vez que envíes tus documentos.
        </p>
      </div>

      {ufPreEvaluation && (
        <div className="rounded-xl border border-neon-cyan/30 bg-neon-cyan/5 p-4">
          <p className="text-sm text-text-secondary">
            Podrías optar a aproximadamente{" "}
            <strong className="text-text-primary">{Math.round(ufPreEvaluation.estimatedPropertyValueUF)} UF</strong>{" "}
            según tu perfil.
          </p>
          <p className="mt-1 text-xs text-text-tertiary">{ufPreEvaluation.disclaimer}</p>
        </div>
      )}

      <Button
        className="glow-cyan w-fit gap-2 bg-neon-cyan text-deep hover:bg-neon-cyan/90"
        disabled={isSubmitting}
        onClick={handleContinue}
      >
        Continuar
      </Button>
    </div>
  )
}

export { InitialProposalCard }
