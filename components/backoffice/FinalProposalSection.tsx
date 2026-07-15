"use client"

import * as React from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
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

const STAGES_ALLOWING_FINAL_PROPOSAL = ["ENVIADO_A_BANCO", "ESCRITURACION_AGENDADA", "CIERRE"]
const MAX_OPTIONS = 6

const PURPOSE_LABELS: Record<string, string> = {
  inversion: "Inversión",
  vivienda_propia: "Vivienda propia",
}

const STATUS_STYLES: Record<ProposalOption["status"], string> = {
  pendiente: "border-glass-border bg-glass text-text-secondary",
  aceptada: "border-status-success/40 bg-status-success/10 text-status-success",
  rechazada: "border-text-tertiary/40 bg-text-tertiary/10 text-text-tertiary",
}

const EMPTY_FORM = { departmentCount: "1", purpose: "", comuna: "", priceUf: "", notes: "" }

/**
 * Propuesta final que el asesor carga tras la visita y el envío a
 * evaluación bancaria: hasta 6 opciones concretas (departamento + comuna +
 * precio) para que el cliente elija con cuál se queda antes de avanzar a
 * escrituración (ver STAGE_TRANSITIONS.ENVIADO_A_BANCO, dejó de ser
 * automática justamente para esperar esta aceptación).
 */
function FinalProposalSection({ applicationId, stage }: { applicationId: string; stage: string }) {
  const [options, setOptions] = React.useState<ProposalOption[]>([])
  const [loading, setLoading] = React.useState(true)
  const [form, setForm] = React.useState(EMPTY_FORM)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const load = React.useCallback(() => {
    setLoading(true)
    fetch(`/api/applications/${applicationId}/proposal-options`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setOptions(data?.options ?? []))
      .finally(() => setLoading(false))
  }, [applicationId])

  React.useEffect(() => {
    load()
  }, [load])

  if (!STAGES_ALLOWING_FINAL_PROPOSAL.includes(stage)) return null

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/applications/${applicationId}/proposal-options`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departmentCount: Number(form.departmentCount),
          purpose: form.purpose || undefined,
          comuna: form.comuna || undefined,
          priceUf: form.priceUf ? Number(form.priceUf) : undefined,
          notes: form.notes || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        toast.error(data?.error ?? "No se pudo agregar la opción.")
        return
      }
      toast.success("Opción de propuesta agregada.")
      setForm(EMPTY_FORM)
      load()
    } finally {
      setIsSubmitting(false)
    }
  }

  async function remove(optionId: string) {
    const res = await fetch(`/api/applications/${applicationId}/proposal-options/${optionId}`, {
      method: "DELETE",
    })
    if (!res.ok) {
      toast.error("No se pudo eliminar la opción.")
      return
    }
    load()
  }

  const canAddMore = options.length < MAX_OPTIONS
  const hasAccepted = options.some((o) => o.status === "aceptada")

  return (
    <div className="glass-surface rounded-xl p-5">
      <h2 className="mb-1 font-heading text-sm font-semibold text-text-primary">Propuesta final</h2>
      <p className="mb-4 text-xs text-text-tertiary">
        Hasta 6 opciones concretas (departamento + comuna + precio) para que el cliente elija antes de escriturar.
      </p>

      {loading ? (
        <p className="text-sm text-text-tertiary">Cargando...</p>
      ) : (
        <div className="mb-4 flex flex-col gap-2">
          {options.length === 0 ? (
            <p className="text-sm text-text-tertiary">Todavía no hay opciones cargadas.</p>
          ) : (
            options.map((option) => (
              <div
                key={option.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-glass-border p-3 text-sm"
              >
                <div>
                  <p className="font-medium text-text-primary">
                    {option.department_count} depto{option.department_count > 1 ? "s" : ""}
                    {option.comuna ? ` — ${option.comuna}` : ""}
                    {option.price_uf ? ` — ${option.price_uf} UF` : ""}
                  </p>
                  <p className="text-xs text-text-tertiary">
                    {option.purpose ? PURPOSE_LABELS[option.purpose] : "Sin propósito"}
                    {option.notes ? ` · ${option.notes}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("rounded-full border px-2 py-0.5 text-xs font-medium", STATUS_STYLES[option.status])}>
                    {option.status}
                  </span>
                  {option.status !== "aceptada" && (
                    <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-status-error" onClick={() => remove(option.id)}>
                      Quitar
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {hasAccepted && (
        <p className="mb-4 text-xs text-status-success">
          El cliente ya aceptó una opción. Puedes avanzar la solicitud a escrituración.
        </p>
      )}

      {canAddMore && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 border-t border-glass-border pt-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field>
              <FieldLabel htmlFor="departmentCount">Deptos</FieldLabel>
              <select
                id="departmentCount"
                className="bg-surface-elevated border-glass-border h-9 w-full rounded-md border px-2 text-sm text-text-primary outline-none"
                value={form.departmentCount}
                onChange={(e) => setForm((f) => ({ ...f, departmentCount: e.target.value }))}
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </Field>
            <Field>
              <FieldLabel htmlFor="purpose">Propósito</FieldLabel>
              <select
                id="purpose"
                className="bg-surface-elevated border-glass-border h-9 w-full rounded-md border px-2 text-sm text-text-primary outline-none"
                value={form.purpose}
                onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))}
              >
                <option value="">—</option>
                <option value="inversion">Inversión</option>
                <option value="vivienda_propia">Vivienda propia</option>
              </select>
            </Field>
            <Field>
              <FieldLabel htmlFor="comuna">Comuna</FieldLabel>
              <Input
                id="comuna"
                className="bg-surface-elevated border-glass-border h-9"
                value={form.comuna}
                onChange={(e) => setForm((f) => ({ ...f, comuna: e.target.value }))}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="priceUf">Precio UF</FieldLabel>
              <Input
                id="priceUf"
                type="number"
                className="bg-surface-elevated border-glass-border h-9"
                value={form.priceUf}
                onChange={(e) => setForm((f) => ({ ...f, priceUf: e.target.value }))}
              />
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="notes">Notas (opcional)</FieldLabel>
            <Input
              id="notes"
              className="bg-surface-elevated border-glass-border"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </Field>
          <Button type="submit" size="sm" disabled={isSubmitting} className="w-fit">
            {isSubmitting ? "Agregando..." : "Agregar opción"}
          </Button>
        </form>
      )}
    </div>
  )
}

export { FinalProposalSection }
