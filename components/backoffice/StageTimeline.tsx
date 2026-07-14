import { CheckCircle2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { STAGE_LABELS, APPLICATION_STAGES_ORDER, isNoteOnlyEntry, type StageHistoryRow } from "./types"

interface StageTimelineProps {
  currentStage: string
  stageHistory: StageHistoryRow[]
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/** Timeline vertical de los 9 estados de la aplicación, con timestamp de
 * llegada a cada uno (tomado de `application_stage_history.to_stage`, la
 * entrada más reciente si el asesor revirtió/reintentó). Acento morado
 * (`glow-purple`) — vista de asesor, distinta del cian de cliente. */
function StageTimeline({ currentStage, stageHistory }: StageTimelineProps) {
  const currentIndex = APPLICATION_STAGES_ORDER.indexOf(currentStage as never)

  // Solo entradas reales de cambio de estado (excluye notas puras).
  const transitions = stageHistory.filter((entry) => !isNoteOnlyEntry(entry))

  // stageHistory viene ordenado desc (más reciente primero); recorremos en
  // orden cronológico ascendente y nos quedamos con la primera vez que
  // vemos cada `to_stage`, que es su llegada más temprana.
  const timestampByStage = new Map<string, string>()
  const ascending = [...transitions].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
  for (const entry of ascending) {
    if (!timestampByStage.has(entry.to_stage)) {
      timestampByStage.set(entry.to_stage, entry.created_at)
    }
  }

  return (
    <ol className="flex w-full flex-col gap-0">
      {APPLICATION_STAGES_ORDER.map((stage, index) => {
        const isCompleted = currentIndex >= 0 && index < currentIndex
        const isCurrent = index === currentIndex
        const isFuture = currentIndex >= 0 ? index > currentIndex : true
        const isLast = index === APPLICATION_STAGES_ORDER.length - 1
        const timestamp = timestampByStage.get(stage)

        return (
          <li key={stage} className="relative flex items-start gap-4 pb-8 last:pb-0">
            {!isLast && (
              <div
                className={cn(
                  "absolute left-[15px] top-8 h-[calc(100%-1rem)] w-px",
                  isCompleted ? "bg-neon-green/50" : "bg-border"
                )}
                aria-hidden
              />
            )}

            <div className="relative z-10 flex shrink-0 items-center justify-center">
              {isCompleted ? (
                <span className="flex size-8 items-center justify-center rounded-full border border-neon-green/40 bg-neon-green/10 text-neon-green">
                  <CheckCircle2 className="size-5" aria-hidden />
                </span>
              ) : isCurrent ? (
                <span className="glow-purple flex size-8 items-center justify-center rounded-full border border-neon-purple bg-neon-purple/10 text-neon-purple">
                  <span className="relative flex size-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neon-purple opacity-75 motion-reduce:hidden" />
                    <span className="relative inline-flex size-2.5 rounded-full bg-neon-purple" />
                  </span>
                </span>
              ) : (
                <span className="flex size-8 items-center justify-center rounded-full border border-border bg-dark-tertiary text-xs font-semibold text-text-tertiary">
                  {index + 1}
                </span>
              )}
            </div>

            <div className="flex min-w-0 flex-col justify-center pt-1.5">
              <span
                className={cn(
                  "text-sm font-medium leading-tight",
                  isCurrent && "text-neon-purple",
                  isCompleted && "text-text-primary",
                  isFuture && "text-text-tertiary"
                )}
              >
                {STAGE_LABELS[stage] ?? stage}
              </span>
              <span className="text-xs text-text-tertiary">
                {timestamp ? formatTimestamp(timestamp) : isCurrent ? "En progreso" : isFuture ? "Pendiente" : "—"}
              </span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export { StageTimeline }
