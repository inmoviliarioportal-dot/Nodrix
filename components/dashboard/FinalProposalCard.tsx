"use client"

import * as React from "react"
import { toast } from "sonner"
import { Building2, CheckCircle2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ProposalOption {
  id: string
  department_count: number
  purpose: string | null
  comuna: string | null
  price_uf: number | null
  notes: string | null
  status: "pendiente" | "aceptada" | "rechazada"
}

const PURPOSE_LABELS: Record<string, string> = {
  inversion: "Inversión",
  vivienda_propia: "Vivienda propia",
}

/**
 * Propuesta final enviada por el asesor tras la visita y la aprobación
 * bancaria: el cliente ve hasta 6 opciones concretas (departamento + comuna
 * + precio) y elige con cuál se queda. Este es el paso previo a la
 * aceptación final antes de escriturar.
 */
function FinalProposalCard({ applicationId }: { applicationId: string }) {
  const [options, setOptions] = React.useState<ProposalOption[] | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [acceptingId, setAcceptingId] = React.useState<string | null>(null)

  const load = React.useCallback(() => {
    fetch(`/api/applications/${applicationId}/proposal-options`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setOptions(data?.options ?? []))
      .catch(() => setOptions([]))
      .finally(() => setLoading(false))
  }, [applicationId])

  React.useEffect(() => {
    load()
  }, [load])

  async function accept(optionId: string) {
    setAcceptingId(optionId)
    try {
      const res = await fetch(`/api/applications/${applicationId}/proposal-options/${optionId}/accept`, {
        method: "POST",
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        toast.error(data?.error ?? "No se pudo aceptar la opción.")
        return
      }
      toast.success("¡Opción aceptada! Tu asesor coordinará los siguientes pasos.")
      load()
    } finally {
      setAcceptingId(null)
    }
  }

  if (loading || !options || options.length === 0) return null

  const accepted = options.find((o) => o.status === "aceptada")

  return (
    <div className="glass-card flex flex-col gap-4 rounded-2xl p-6">
      <div>
        <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-text-tertiary">
          Tu propuesta final
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Tu asesor preparó estas opciones tras tu visita y la evaluación bancaria. Elige con cuál te quedas para
          continuar con la escrituración.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {options
          .filter((o) => o.status !== "rechazada" || o.id === accepted?.id)
          .map((option) => (
            <div
              key={option.id}
              className={cn(
                "flex flex-col gap-2 rounded-xl border p-4",
                option.status === "aceptada"
                  ? "border-status-success/50 bg-status-success/5"
                  : "border-glass-border bg-surface-elevated"
              )}
            >
              <div className="flex items-center gap-2">
                <Building2 className="size-4 text-neon-cyan" />
                <p className="text-sm font-medium text-text-primary">
                  {option.department_count} departamento{option.department_count > 1 ? "s" : ""}
                </p>
              </div>
              {option.comuna && <p className="text-xs text-text-secondary">{option.comuna}</p>}
              {option.price_uf && (
                <p className="text-xs text-text-secondary">
                  <span className="font-medium text-text-primary">{option.price_uf} UF</span>
                </p>
              )}
              {option.purpose && (
                <p className="text-xs text-text-tertiary">{PURPOSE_LABELS[option.purpose] ?? option.purpose}</p>
              )}
              {option.notes && <p className="text-xs text-text-tertiary">{option.notes}</p>}

              {option.status === "aceptada" ? (
                <span className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-full border border-status-success/40 bg-status-success/10 px-2 py-0.5 text-xs font-medium text-status-success">
                  <CheckCircle2 className="size-3.5" />
                  Elegida
                </span>
              ) : (
                !accepted && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-1"
                    disabled={acceptingId === option.id}
                    onClick={() => accept(option.id)}
                  >
                    {acceptingId === option.id ? "Confirmando..." : "Elegir esta opción"}
                  </Button>
                )
              )}
            </div>
          ))}
      </div>
    </div>
  )
}

export { FinalProposalCard }
