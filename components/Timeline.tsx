import { cn } from "@/lib/utils"

/**
 * Los 9 estados estándar del flujo de una solicitud, desde que se recibe
 * hasta el cierre de la operación. Usado como default si el consumidor
 * no pasa `stages` explícitamente.
 */
export const DEFAULT_TIMELINE_STAGES = [
  "RECEPCIONADA",
  "EN_REVISION",
  "DOCUMENTACION",
  "SCORING",
  "PRE_APROBADA",
  "APROBADA",
  "FIRMA",
  "ESCRITURACION",
  "CIERRE",
] as const

export interface TimelineProps extends React.ComponentProps<"ol"> {
  /** Estado actual del flujo (debe coincidir con un valor de `stages`). */
  currentStage: string
  /** Lista ordenada de estados del flujo. Por defecto usa los 9 estados estándar. */
  stages?: string[]
  /** Etiquetas legibles para cada estado (opcional). Si no se define, se formatea el string. */
  labels?: Record<string, string>
}

function formatStageLabel(stage: string) {
  return stage
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

/**
 * Timeline horizontal/vertical reutilizable para visualizar el avance de una
 * solicitud a través de los 9 estados del flujo.
 *
 * - Estado actual: resaltado en gold (accent premium).
 * - Estados pasados: verde tenue (completados).
 * - Estados futuros: gris (pendientes).
 */
function Timeline({
  currentStage,
  stages = [...DEFAULT_TIMELINE_STAGES],
  labels,
  className,
  ...props
}: TimelineProps) {
  const currentIndex = stages.indexOf(currentStage)

  return (
    <ol
      data-slot="timeline"
      className={cn(
        "flex w-full flex-col gap-0 sm:flex-row sm:items-start",
        className
      )}
      {...props}
    >
      {stages.map((stage, index) => {
        const isCompleted = currentIndex >= 0 && index < currentIndex
        const isCurrent = index === currentIndex
        const isFuture = currentIndex >= 0 ? index > currentIndex : true
        const label = labels?.[stage] ?? formatStageLabel(stage)

        return (
          <li
            key={stage}
            data-slot="timeline-item"
            data-state={
              isCurrent ? "current" : isCompleted ? "completed" : "future"
            }
            className="flex flex-1 flex-col items-start gap-2 sm:items-center sm:text-center"
          >
            <div className="flex w-full items-center sm:flex-col">
              {/* Línea previa (oculta en el primer item) */}
              <div
                className={cn(
                  "hidden h-px flex-1 sm:block",
                  index === 0 && "sm:invisible",
                  isCompleted || isCurrent ? "bg-success/50" : "bg-border"
                )}
              />

              <div
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors duration-200 sm:mx-2",
                  isCurrent &&
                    "border-gold bg-gold/15 text-gold shadow-[0_0_0_3px] shadow-gold/15",
                  isCompleted &&
                    "border-success/40 bg-success/10 text-success",
                  isFuture &&
                    "border-border bg-dark-tertiary text-text-tertiary"
                )}
              >
                {index + 1}
              </div>

              <div
                className={cn(
                  "hidden h-px flex-1 sm:block",
                  index === stages.length - 1 && "sm:invisible",
                  isCompleted ? "bg-success/50" : "bg-border"
                )}
              />
            </div>

            <span
              className={cn(
                "text-xs leading-tight font-medium",
                isCurrent && "text-gold",
                isCompleted && "text-success",
                isFuture && "text-text-tertiary"
              )}
            >
              {label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

export { Timeline }
