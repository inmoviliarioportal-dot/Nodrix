import { ArrowRightCircle } from "lucide-react"

import { nextStepForStage } from "./types"

export interface NextStepCardProps {
  stage: string
}

/** Tile compacto de "próximo paso": mensaje contextual mock según el stage actual. */
function NextStepCard({ stage }: NextStepCardProps) {
  return (
    <div className="glass-surface flex flex-col gap-1.5 rounded-xl border border-glass-border p-3">
      <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-text-tertiary">
        <ArrowRightCircle className="size-3.5 text-neon-cyan" aria-hidden="true" />
        Próximo paso
      </span>
      <p className="line-clamp-2 text-[12px] leading-snug text-text-secondary">{nextStepForStage(stage)}</p>
    </div>
  )
}

export { NextStepCard }
