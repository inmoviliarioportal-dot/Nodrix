import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { nextStepForStage } from "./types"

export interface NextStepCardProps {
  stage: string
}

/** Card de "próximo paso": mensaje contextual mock según el stage actual. */
function NextStepCard({ stage }: NextStepCardProps) {
  return (
    <Card size="sm" className="glass-surface gap-2.5 border-glass-border">
      <CardHeader>
        <CardTitle className="text-[13px] font-bold text-text-primary">Próximo paso</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-[12.5px] leading-relaxed text-text-secondary">{nextStepForStage(stage)}</p>
      </CardContent>
    </Card>
  )
}

export { NextStepCard }
