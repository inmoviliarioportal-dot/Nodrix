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
    <Card>
      <CardHeader>
        <CardTitle>Pre-evaluación</CardTitle>
      </CardHeader>
      <CardContent>
        {hasRange ? (
          <p className="text-sm text-text-secondary">
            Rango estimado: {minUf.toLocaleString("es-CL")} — {maxUf!.toLocaleString("es-CL")} UF
          </p>
        ) : (
          <p className="text-sm text-text-tertiary">Pendiente revisión.</p>
        )}
      </CardContent>
    </Card>
  )
}

export { PreEvaluationCard }
