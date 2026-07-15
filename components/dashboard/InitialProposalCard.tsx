"use client"

import * as React from "react"
import { toast } from "sonner"
import { Building2, TrendingUp, Home } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface BandResult {
  band: "1" | "1-2" | "2-3" | "3-4" | "4-5" | "5-6"
  label: string
  approvalProbability: number
}

type Purpose = "inversion" | "vivienda_propia"

const PURPOSE_LABELS: Record<Purpose, string> = {
  inversion: "Inversión",
  vivienda_propia: "Vivienda propia",
}

const PURPOSE_ICONS: Record<Purpose, React.ElementType> = {
  inversion: TrendingUp,
  vivienda_propia: Home,
}

function probabilityStyles(probability: number): string {
  if (probability >= 65) return "border-status-success/40 bg-status-success/10 text-status-success"
  if (probability >= 35) return "border-status-warning/40 bg-status-warning/10 text-status-warning"
  return "border-status-error/40 bg-status-error/10 text-status-error"
}

/**
 * Selección de propuesta inicial (simulación de riesgo) ANTES de subir
 * documentos: el cliente ve, para cada tramo de departamentos (1 / 1-2 /
 * 2-3 / 3-4 / 4-5 / 5-6), el % estimado de probabilidad de aprobación
 * bancaria según su scoring -- SIEMPRE se muestran ambos lentes (inversión
 * y vivienda propia), incluso si el cliente registró solo uno de los dos,
 * porque puede interesarle la otra alternativa. Es una simulación: la
 * propuesta final la define el asesor después de la visita y la aprobación
 * bancaria.
 */
function InitialProposalCard({
  applicationId,
  onSelected,
}: {
  applicationId: string
  onSelected: () => void
}) {
  const [bands, setBands] = React.useState<BandResult[] | null>(null)
  const [registeredPurpose, setRegisteredPurpose] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [activePurpose, setActivePurpose] = React.useState<Purpose>("inversion")
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  React.useEffect(() => {
    fetch(`/api/applications/${applicationId}/proposal-bands`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setBands(data?.bands ?? [])
        setRegisteredPurpose(data?.registeredPurpose ?? null)
        if (data?.registeredPurpose === "vivienda_propia") setActivePurpose("vivienda_propia")
      })
      .catch(() => setBands([]))
      .finally(() => setLoading(false))
  }, [applicationId])

  async function handleSelect(band: BandResult["band"]) {
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/applications/${applicationId}/select-initial-proposal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ band, purpose: activePurpose }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        toast.error(data?.error ?? "No se pudo guardar tu selección.")
        return
      }
      toast.success("Propuesta inicial seleccionada. Ahora sube tus documentos.")
      onSelected()
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-6">
        <p className="text-sm text-text-tertiary">Calculando tu simulación de riesgo...</p>
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
          Según tu perfil, este es el <strong>% estimado de probabilidad de aprobación bancaria</strong> por cada
          tramo de departamentos. Es una <strong>simulación</strong>, no una aprobación: queda sujeta a confirmación
          una vez que envíes tus documentos y estos sean evaluados por el banco.
        </p>
      </div>

      <div className="flex gap-1 rounded-lg border border-glass-border bg-surface-elevated p-1">
        {(["inversion", "vivienda_propia"] as Purpose[]).map((purpose) => {
          const Icon = PURPOSE_ICONS[purpose]
          return (
            <button
              key={purpose}
              type="button"
              onClick={() => setActivePurpose(purpose)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                activePurpose === purpose
                  ? "bg-neon-cyan/10 text-neon-cyan"
                  : "text-text-tertiary hover:text-text-primary"
              )}
            >
              <Icon className="size-3.5" />
              {PURPOSE_LABELS[purpose]}
              {registeredPurpose === purpose && (
                <span className="rounded-full bg-neon-cyan/20 px-1.5 py-0.5 text-[10px]">tu elección</span>
              )}
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(bands ?? []).map((result) => (
          <div
            key={result.band}
            className="flex flex-col gap-3 rounded-xl border border-glass-border bg-surface-elevated p-4"
          >
            <div className="flex items-center gap-2">
              <Building2 className="size-4 text-neon-cyan" />
              <p className="text-sm font-medium text-text-primary">{result.label}</p>
            </div>
            <span
              className={cn(
                "inline-flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
                probabilityStyles(result.approvalProbability)
              )}
            >
              {result.approvalProbability}% de probabilidad estimada
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => handleSelect(result.band)}
            >
              Elegir esta propuesta
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}

export { InitialProposalCard }
