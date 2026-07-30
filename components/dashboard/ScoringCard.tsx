import { Gauge } from "lucide-react"

import { ScoringBadge, type ScoringCategory } from "@/components/ui/scoring-badge"
import type { ScoringResult } from "./types"

export interface ScoringCardProps {
  scoring?: ScoringResult | null
}

function isScoringCategory(value: unknown): value is ScoringCategory {
  return value === "BRONCE" || value === "PLATA" || value === "ORO" || value === "PLATINO" || value === "BLACK"
}

/** Tile compacto de scoring: categoría + explicación (2 líneas máx), o "pendiente" si aún no se calculó. */
function ScoringCard({ scoring }: ScoringCardProps) {
  const hasScoring = !!scoring && isScoringCategory(scoring.category)

  return (
    <div className="glass-surface flex flex-col gap-1.5 rounded-xl border border-glass-border p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-text-tertiary">
          <Gauge className="size-3.5 text-neon-cyan" aria-hidden="true" />
          Scoring
        </span>
        {hasScoring && <ScoringBadge category={scoring!.category} />}
      </div>
      <p className="line-clamp-2 text-[12px] leading-snug text-text-secondary">
        {hasScoring ? scoring!.explanation : "Pendiente de evaluación."}
      </p>
    </div>
  )
}

export { ScoringCard }
