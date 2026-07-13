import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { nextStepForStage } from "./types"

export interface NextStepCardProps {
  stage: string
}

/** Card de "próximo paso": mensaje contextual mock según el stage actual. */
function NextStepCard({ stage }: NextStepCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Próximo paso</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-text-secondary">{nextStepForStage(stage)}</p>
      </CardContent>
    </Card>
  )
}

export { NextStepCard }
