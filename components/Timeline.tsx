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
}

function formatStageLabel(stage: string) {
  return stage
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

/**
 * Timeline VERTICAL — "Command Center" (rediseño Fase 6).
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
  className,
  ...props
}: TimelineProps) {
  const currentIndex = stages.indexOf(currentStage)

  return (
    <ol
      data-slot="timeline"
      className={cn("flex w-full flex-col gap-0", className)}
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
            data-state={
              isCurrent ? "current" : isCompleted ? "completed" : "future"
            }
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
              {isCompleted ? (
                <span className="flex size-8 items-center justify-center rounded-full border border-neon-green/40 bg-neon-green/10 text-neon-green">
                  <CheckCircle2 className="size-5" aria-hidden />
                </span>
              ) : isCurrent ? (
                <span className="glow-cyan flex size-8 items-center justify-center rounded-full border border-neon-cyan bg-neon-cyan/10 text-neon-cyan">
                  <span className="relative flex size-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neon-cyan opacity-75 motion-reduce:hidden" />
                    <span className="relative inline-flex size-2.5 rounded-full bg-neon-cyan" />
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
                  isCurrent && "text-neon-cyan",
                  isCompleted && "text-text-primary",
                  isFuture && "text-text-tertiary"
                )}
              >
                {label}
              </span>
              {isCurrent && (
                <span className="text-xs text-text-tertiary">En progreso</span>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export { Timeline }
