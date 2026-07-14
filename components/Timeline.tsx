import { CheckCircle2 } from "lucide-react"

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
  /**
   * `"vertical"` (default) — usado en Backoffice/Admin ("Command Center").
   * `"horizontal"` — stepper de izquierda a derecha, usado en el dashboard
   * del cliente: cada paso "se enciende" (glow cian) al llegar a él y queda
   * marcado en verde una vez superado.
   */
  orientation?: "vertical" | "horizontal"
}

function formatStageLabel(stage: string) {
  return stage
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

function StepIndicator({
  isCompleted,
  isCurrent,
  index,
}: {
  isCompleted: boolean
  isCurrent: boolean
  index: number
}) {
  if (isCompleted) {
    return (
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-neon-green/40 bg-neon-green/10 text-neon-green">
        <CheckCircle2 className="size-5" aria-hidden />
      </span>
    )
  }
  if (isCurrent) {
    return (
      <span className="glow-cyan flex size-8 shrink-0 items-center justify-center rounded-full border border-neon-cyan bg-neon-cyan/10 text-neon-cyan">
        <span className="relative flex size-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neon-cyan opacity-75 motion-reduce:hidden" />
          <span className="relative inline-flex size-2.5 rounded-full bg-neon-cyan" />
        </span>
      </span>
    )
  }
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-dark-tertiary text-xs font-semibold text-text-tertiary">
      {index + 1}
    </span>
  )
}

/**
 * Timeline — vertical ("Command Center", Backoffice/Admin) u horizontal
 * (stepper izquierda→derecha, dashboard del cliente).
 *
 * - Pasos completados: check verde (`--neon-green`).
 * - Etapa actual: resaltada en cian (`--neon-cyan`) con glow sutil + punto
 *   pulsante (respeta `prefers-reduced-motion` vía la utilidad `animate-pulse`
 *   de Tailwind, que ya honra la media query por defecto en navegadores
 *   modernos combinada con `motion-reduce:animate-none`).
 * - Pasos futuros: atenuados (`text-text-tertiary`).
 */
function Timeline({
  currentStage,
  stages = [...DEFAULT_TIMELINE_STAGES],
  labels,
  orientation = "vertical",
  className,
  ...props
}: TimelineProps) {
  const currentIndex = stages.indexOf(currentStage)

  if (orientation === "horizontal") {
    return (
      <div className="w-full min-w-0 overflow-x-auto pb-1">
        <ol
          data-slot="timeline"
          data-orientation="horizontal"
          className={cn("flex items-start gap-0", className)}
          {...props}
        >
          {stages.map((stage, index) => {
            const isCompleted = currentIndex >= 0 && index < currentIndex
            const isCurrent = index === currentIndex
            const isFuture = currentIndex >= 0 ? index > currentIndex : true
            const label = labels?.[stage] ?? formatStageLabel(stage)
            const isLast = index === stages.length - 1

            return (
              <li
                key={stage}
                data-slot="timeline-item"
                data-state={isCurrent ? "current" : isCompleted ? "completed" : "future"}
                className="relative flex w-20 shrink-0 flex-col items-center gap-2 sm:w-24"
              >
                <div className="relative flex w-full items-center">
                  {/* Línea horizontal conectora hacia el paso anterior */}
                  {index > 0 && (
                    <div
                      className={cn(
                        "absolute right-1/2 h-px w-full -translate-y-1/2",
                        isCompleted || isCurrent ? "bg-neon-green/50" : "bg-border"
                      )}
                      aria-hidden
                    />
                  )}
                  {/* Línea hacia el siguiente paso */}
                  {!isLast && (
                    <div
                      className={cn(
                        "absolute left-1/2 h-px w-full -translate-y-1/2",
                        isCompleted ? "bg-neon-green/50" : "bg-border"
                      )}
                      aria-hidden
                    />
                  )}
                  <div className="relative z-10 mx-auto">
                    <StepIndicator isCompleted={isCompleted} isCurrent={isCurrent} index={index} />
                  </div>
                </div>

                <div className="flex flex-col items-center px-1 text-center">
                  <span
                    className={cn(
                      "text-xs leading-tight font-medium",
                      isCurrent && "text-neon-cyan",
                      isCompleted && "text-text-primary",
                      isFuture && "text-text-tertiary"
                    )}
                  >
                    {label}
                  </span>
                  {isCurrent && <span className="text-[10px] text-text-tertiary">En progreso</span>}
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    )
  }

  return (
    <ol data-slot="timeline" data-orientation="vertical" className={cn("flex w-full flex-col gap-0", className)} {...props}>
      {stages.map((stage, index) => {
        const isCompleted = currentIndex >= 0 && index < currentIndex
        const isCurrent = index === currentIndex
        const isFuture = currentIndex >= 0 ? index > currentIndex : true
        const label = labels?.[stage] ?? formatStageLabel(stage)
        const isLast = index === stages.length - 1

        return (
          <li
            key={stage}
            data-slot="timeline-item"
            data-state={isCurrent ? "current" : isCompleted ? "completed" : "future"}
            className="relative flex items-start gap-4 pb-8 last:pb-0"
          >
            {/* Línea vertical conectora */}
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
              <StepIndicator isCompleted={isCompleted} isCurrent={isCurrent} index={index} />
            </div>

            <div className="flex min-w-0 flex-col justify-center pt-1.5">
              <span
                className={cn(
                  "text-sm font-medium leading-tight",
                  isCurrent && "text-neon-cyan",
                  isCompleted && "text-text-primary",
                  isFuture && "text-text-tertiary"
                )}
              >
                {label}
              </span>
              {isCurrent && <span className="text-xs text-text-tertiary">En progreso</span>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export { Timeline }
