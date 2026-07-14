import * as React from "react"

import { cn } from "@/lib/utils"

export type ScoringCategory = "BRONCE" | "PLATA" | "ORO" | "PLATINO" | "BLACK"

const scoringCategoryStyles: Record<ScoringCategory, string> = {
  BRONCE: "border-[#b08d57]/40 bg-[#b08d57]/15 text-[#c99b66]",
  PLATA: "border-[#c0c0c0]/40 bg-[#c0c0c0]/10 text-[#d1d1d1]",
  ORO: "border-gold/50 bg-gold/15 text-gold",
  PLATINO: "border-gold/60 bg-white/10 text-white shadow-[0_0_0_1px] shadow-gold/30",
  BLACK: "border-neon-purple/60 bg-black/60 text-neon-purple shadow-[0_0_0_1px] shadow-neon-purple/40",
}

const scoringCategoryLabels: Record<ScoringCategory, string> = {
  BRONCE: "Bronce",
  PLATA: "Plata",
  ORO: "Oro",
  PLATINO: "Platino",
  BLACK: "Black",
}

export interface ScoringBadgeProps extends React.ComponentProps<"span"> {
  category: ScoringCategory
}

/**
 * Badge de categoría de scoring crediticio/comercial.
 * Colores fijos por categoría (no configurables) para mantener consistencia
 * visual en todo el portal: BRONCE, PLATA, ORO, PLATINO.
 */
function ScoringBadge({ category, className, ...props }: ScoringBadgeProps) {
  return (
    <span
      data-slot="scoring-badge"
      data-category={category}
      className={cn(
        "inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide whitespace-nowrap uppercase transition-colors duration-200",
        scoringCategoryStyles[category],
        className
      )}
      {...props}
    >
      {scoringCategoryLabels[category]}
    </span>
  )
}

export { ScoringBadge, scoringCategoryStyles, scoringCategoryLabels }
