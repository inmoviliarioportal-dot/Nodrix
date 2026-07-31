"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  AlertTriangle,
  Home,
  Building2,
  KeyRound,
  Timer,
  Lock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Target,
  Check,
} from "lucide-react"

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

type Destination = "vivir" | "airbnb" | "alquiler_tradicional" | "venta_corto_plazo"

const DESTINATION_OPTIONS: { label: string; value: Destination; icon: typeof Home }[] = [
  { label: "Vivir", value: "vivir", icon: Home },
  { label: "Airbnb", value: "airbnb", icon: KeyRound },
  { label: "Alquiler tradicional", value: "alquiler_tradicional", icon: Building2 },
  { label: "Venta a corto plazo", value: "venta_corto_plazo", icon: Timer },
]

/**
 * Chip de destino -- réplica de la referencia visual aportada por el
 * negocio (paleta indigo/azul puntual para esta pantalla, no la navy+oro
 * del resto del sitio): pill blanco con borde suave, ícono + label, y un
 * círculo con check a la derecha cuando está seleccionado (en vez de solo
 * cambiar el color del borde).
 */
function DestinationChip({
  label,
  icon: Icon,
  selected,
  onClick,
}: {
  label: string
  icon: typeof Home
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={
        "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 py-2.5 text-[13.5px] font-semibold transition-all duration-200 ease-out active:scale-[0.98] " +
        (selected
          ? "border-[#2563EB] bg-[#EFF3FF] text-[#1E1B4B]"
          : "border-[#E2E8F0] bg-white text-[#334155] hover:border-[#C7D2FE]")
      }
    >
      <Icon size={16} strokeWidth={2} className={selected ? "text-[#2563EB]" : "text-[#94A3B8]"} />
      {label}
      {selected && (
        <span className="flex size-4 items-center justify-center rounded-full bg-[#2563EB] text-white">
          <Check size={10} strokeWidth={3} />
        </span>
      )}
    </button>
  )
}

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
    <div className="flex flex-col gap-6 rounded-3xl border border-[#EEF0FF] bg-white p-6 shadow-[0_20px_50px_-24px_rgba(30,27,75,0.25)] sm:p-8">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#DBEAFE] text-[#2563EB]">
          <Home className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-[11.5px] font-bold tracking-wide text-[#2563EB] uppercase">Tu propuesta inicial</h2>
          <p className="mt-1 text-sm leading-relaxed text-[#475569]">
            ¡Excelente! Con la información que nos entregaste, ya tenemos una propuesta inicial para ti. Este
            resultado es <strong className="text-[#1E1B4B]">estimado</strong> y se confirmará una vez que subas tus
            documentos.
          </p>
        </div>
      </div>

      {ufPreEvaluation && (
        <div className="relative overflow-hidden rounded-2xl border border-[#DBEAFE] bg-gradient-to-br from-[#EFF6FF] to-[#EEF2FF] p-6 text-center sm:p-8">
          <p className="flex items-center justify-center gap-1.5 text-[13px] font-semibold text-[#2563EB]">
            <ShieldCheck className="size-4" aria-hidden="true" />
            Monto estimado disponible
          </p>
          <p className="mt-1 text-5xl font-extrabold tracking-tight text-[#1E1B4B] sm:text-6xl">
            {Math.round(ufPreEvaluation.estimatedPropertyValueUF).toLocaleString("es-CL")}
            <span className="ml-1.5 text-2xl text-[#2563EB] sm:text-3xl">UF</span>
          </p>
          <p className="mt-3 text-[15px] font-semibold text-[#2563EB]">
            Ahora vamos a mostrarte opciones que sí pueden calzar contigo.
          </p>
          <p className="mt-3 text-xs leading-relaxed text-[#64748B]">{ufPreEvaluation.disclaimer}</p>
        </div>
      )}

      <div>
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-[#FFEDD5] text-[#EA580C]">
            <Target className="size-4.5" aria-hidden="true" />
          </span>
          <h3 className="text-base font-bold text-[#1E1B4B]">¿Para qué quieres tu inmueble?</h3>
        </div>
        <p className="mt-1.5 text-xs text-[#64748B]">
          Selecciona una o más opciones para recomendarte oportunidades más alineadas a tu objetivo.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {DESTINATION_OPTIONS.map((opt) => (
            <DestinationChip
              key={opt.value}
              label={opt.label}
              icon={opt.icon}
              selected={destinations.includes(opt.value)}
              onClick={() => toggleDestination(opt.value)}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center gap-3">
        <span
          className="hidden -rotate-6 text-[13px] font-medium text-[#94A3B8] italic sm:block"
          aria-hidden="true"
        >
          ¡Sigamos!
        </span>
        <Button
          className="w-full gap-2 rounded-full bg-gradient-to-r from-[#2563EB] to-[#4F46E5] text-white shadow-[0_10px_24px_-8px_rgba(37,99,235,0.55)] hover:brightness-105 sm:w-fit sm:px-8"
          disabled={isSubmitting || destinations.length === 0}
          onClick={handleContinue}
        >
          <Sparkles className="size-4" aria-hidden="true" />
          {isSubmitting ? "Guardando..." : "Ver mis opciones"}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
      </div>

      <p className="flex items-center justify-center gap-1.5 text-[11.5px] text-[#94A3B8]">
        <Lock className="size-3" aria-hidden="true" />
        Tu información está segura y protegida.
      </p>
    </div>
  )
}

export { InitialProposalCard }
