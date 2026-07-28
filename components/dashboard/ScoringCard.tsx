import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScoringBadge, type ScoringCategory } from "@/components/ui/scoring-badge"
import type { ScoringResult } from "./types"

export interface ScoringCardProps {
  scoring?: ScoringResult | null
}

function isScoringCategory(value: unknown): value is ScoringCategory {
  return value === "BRONCE" || value === "PLATA" || value === "ORO" || value === "PLATINO" || value === "BLACK"
}

/** Card de scoring: categoría + explicación, o estado "pendiente" si aún no se calculó. */
function ScoringCard({ scoring }: ScoringCardProps) {
  const hasScoring = !!scoring && isScoringCategory(scoring.category)

  return (
    <Card size="sm" className="glass-surface gap-2.5 border-glass-border">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 text-[13px] font-bold text-text-primary">
          Scoring
          {hasScoring && <ScoringBadge category={scoring!.category} />}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {hasScoring ? (
          <p className="line-clamp-3 whitespace-pre-line text-[12.5px] leading-relaxed text-text-secondary">
            {scoring!.explanation}
          </p>
        ) : (
          <p className="text-[12.5px] text-text-tertiary">Pendiente de evaluación.</p>
        )}
      </CardContent>
    </Card>
  )
}

export { ScoringCard }
