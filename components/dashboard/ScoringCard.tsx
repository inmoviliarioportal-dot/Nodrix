import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScoringBadge, type ScoringCategory } from "@/components/ui/scoring-badge"
import type { ScoringResult } from "./types"

export interface ScoringCardProps {
  scoring?: ScoringResult | null
}

function isScoringCategory(value: unknown): value is ScoringCategory {
  return value === "BRONCE" || value === "PLATA" || value === "ORO" || value === "PLATINO"
}

/** Card de scoring: categoría + explicación, o estado "pendiente" si aún no se calculó. */
function ScoringCard({ scoring }: ScoringCardProps) {
  const hasScoring = !!scoring && isScoringCategory(scoring.category)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          Scoring
          {hasScoring && <ScoringBadge category={scoring!.category} />}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {hasScoring ? (
          <p className="whitespace-pre-line text-sm text-text-secondary">
            {scoring!.explanation}
          </p>
        ) : (
          <p className="text-sm text-text-tertiary">Pendiente de evaluación.</p>
        )}
      </CardContent>
    </Card>
  )
}

export { ScoringCard }
