import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export interface PreEvaluationCardProps {
  minUf?: number | null
  maxUf?: number | null
}

/**
 * Card de pre-evaluación financiera (rango UF). Funcionalidad real de cálculo
 * es Release 2 — en Release 1 mostramos el rango si ya vino en la
 * application, o un estado "pendiente revisión" mock.
 */
function PreEvaluationCard({ minUf, maxUf }: PreEvaluationCardProps) {
  const hasRange = typeof minUf === "number" && typeof maxUf === "number"

  return (
    <Card size="sm" className="glass-surface gap-2.5 border-glass-border">
      <CardHeader>
        <CardTitle className="text-[13px] font-bold text-text-primary">Pre-evaluación</CardTitle>
      </CardHeader>
      <CardContent>
        {hasRange ? (
          <p className="text-[12.5px] leading-relaxed text-text-secondary">
            Rango estimado: {minUf.toLocaleString("es-CL")} — {maxUf!.toLocaleString("es-CL")} UF
          </p>
        ) : (
          <p className="text-[12.5px] text-text-tertiary">Pendiente revisión.</p>
        )}
      </CardContent>
    </Card>
  )
}

export { PreEvaluationCard }
