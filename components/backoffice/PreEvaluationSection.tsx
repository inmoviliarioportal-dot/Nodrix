"use client"

import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ApplicationRow } from "@/lib/leads"

interface PreEvaluationSectionProps {
  application: ApplicationRow
  onUpdated: (application: ApplicationRow) => void
}

/** Simulador hipotecario mock (ver `app/api/applications/[id]/pre-evaluate/route.ts`
 * para el disclaimer completo: no es una pre-aprobación bancaria real). */
function PreEvaluationSection({ application, onUpdated }: PreEvaluationSectionProps) {
  const [loading, setLoading] = useState(false)

  const hasResult =
    application.pre_evaluation_min_uf != null && application.pre_evaluation_max_uf != null

  async function handleCalculate() {
    setLoading(true)
    try {
      const res = await fetch(`/api/applications/${application.id}/pre-evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recalculate: true }),
      })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const data = await res.json()
      onUpdated(data.application ?? application)
      toast.success("Pre-evaluación calculada.")
    } catch {
      toast.error("No se pudo calcular la pre-evaluación.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="glass-card border-glass-border">
      <CardHeader>
        <CardTitle>Pre-evaluación</CardTitle>
        <CardAction>
          <Button size="sm" variant="outline" disabled={loading} onClick={handleCalculate}>
            {loading ? "Calculando..." : hasResult ? "Recalcular" : "Calcular"}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {hasResult ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="flex flex-col">
              <span className="text-xs text-text-tertiary">Mín. UF</span>
              <span className="text-glow-purple font-heading text-2xl font-semibold tabular-nums text-text-primary">
                {application.pre_evaluation_min_uf}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-text-tertiary">Máx. UF</span>
              <span className="text-glow-purple font-heading text-2xl font-semibold tabular-nums text-text-primary">
                {application.pre_evaluation_max_uf}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-text-tertiary">Pendiente de cálculo.</p>
        )}
        <p className="mt-3 text-xs text-text-tertiary">
          Simulador ilustrativo — no constituye una pre-aprobación bancaria real.
        </p>
      </CardContent>
    </Card>
  )
}

export { PreEvaluationSection }
