"use client"

import { useRouter } from "next/navigation"
import { Clock } from "lucide-react"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { ScoringBadge, type ScoringCategory } from "@/components/ui/scoring-badge"
import { cn } from "@/lib/utils"
import { STAGE_LABELS, daysInStage, maskRut, type QueueLead } from "./types"

const CATEGORY_GLOW: Record<ScoringCategory, string> = {
  BRONCE: "",
  PLATA: "",
  ORO: "glow-cyan",
  PLATINO: "glow-purple",
}

function isScoringCategory(value: unknown): value is ScoringCategory {
  return value === "BRONCE" || value === "PLATA" || value === "ORO" || value === "PLATINO"
}

interface LeadCardProps {
  lead: QueueLead
}

/** Tarjeta de un lead en la cola del asesor: identidad, scoring, stage y días en stage. */
function LeadCard({ lead }: LeadCardProps) {
  const router = useRouter()
  const { application, customer } = lead

  const category = isScoringCategory(application.scoring_category)
    ? application.scoring_category
    : null
  const days = daysInStage(application.updated_at)
  const isStale = days > 7

  return (
    <Card
      onClick={() => router.push(`/backoffice/${application.id}`)}
      className={cn(
        "glass-card cursor-pointer rounded-xl border-glass-border transition-all duration-200 hover:bg-white/[0.06]",
        category ? CATEGORY_GLOW[category] : ""
      )}
    >
      <CardHeader className="flex-row items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <p className="font-heading text-sm font-medium text-text-primary">
            {customer?.name ?? "Cliente sin nombre"}
          </p>
          <p className="text-xs text-text-tertiary">{maskRut(customer)}</p>
        </div>
        {category && <ScoringBadge category={category} />}
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <p className="text-xs text-text-secondary">{customer?.email ?? "—"}</p>

        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="rounded-full border border-glass-border bg-glass px-2 py-0.5 text-xs text-text-secondary">
            {STAGE_LABELS[application.stage as keyof typeof STAGE_LABELS] ?? application.stage}
          </span>
          <span
            className={cn(
              "flex items-center gap-1 text-xs font-medium",
              isStale ? "text-error" : "text-text-tertiary"
            )}
          >
            <Clock className="size-3.5" />
            {days}d en stage
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

export { LeadCard }
