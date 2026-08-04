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
  /**
   * `"comfortable"` (default) — indicadores de 32px, usado en Backoffice/Admin.
   * `"compact"` — indicadores de 24px y espaciado reducido, usado en la
   * columna angosta del dashboard del cliente para que la línea de tiempo
   * completa quepa sin scroll.
   */
  density?: "comfortable" | "compact"
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
  compact,
}: {
  isCompleted: boolean
  isCurrent: boolean
  index: number
  compact?: boolean
}) {
  const size = compact ? "size-6" : "size-8"
  const dot = compact ? "size-2" : "size-2.5"
  const checkSize = compact ? "size-3.5" : "size-5"
  const numSize = compact ? "text-[10px]" : "text-xs"

  if (isCompleted) {
    return (
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full border border-neon-green/40 bg-neon-green/10 text-neon-green",
          size
        )}
      >
        <CheckCircle2 className={checkSize} aria-hidden />
      </span>
    )
  }
  if (isCurrent) {
    return (
      <span
        className={cn(
          "glow-cyan flex shrink-0 items-center justify-center rounded-full border border-neon-cyan bg-neon-cyan/10 text-neon-cyan",
          size
        )}
      >
        <span className={cn("relative flex", dot)}>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neon-cyan opacity-75 motion-reduce:hidden" />
          <span className={cn("relative inline-flex rounded-full bg-neon-cyan", dot)} />
        </span>
      </span>
    )
  }
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border border-border bg-dark-tertiary font-semibold text-text-tertiary",
        size,
        numSize
      )}
    >
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
  density = "comfortable",
  className,
  ...props
}: TimelineProps) {
  const currentIndex = stages.indexOf(currentStage)
  const compact = density === "compact"

  if (orientation === "horizontal") {
    return (
      <div className="w-full min-w-0 overflow-x-auto pb-1">
        <ol
          data-slot="timeline"
          data-orientation="horizontal"
          className={cn("flex w-full min-w-[560px] items-start gap-0", className)}
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
                className="relative flex min-w-0 flex-1 flex-col items-center gap-2"
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
            className={cn("relative flex items-start gap-3", compact ? "pb-[22px] last:pb-0" : "gap-4 pb-8 last:pb-0")}
          >
            {/* Línea vertical conectora */}
            {!isLast && (
              <div
                className={cn(
                  "absolute w-px",
                  compact ? "left-[11px] top-6 h-[calc(100%-4px)]" : "left-[15px] top-8 h-[calc(100%-1rem)]",
                  isCompleted ? "bg-neon-green/50" : "bg-border"
                )}
                aria-hidden
              />
            )}

            <div className="relative z-10 flex shrink-0 items-center justify-center">
              <StepIndicator isCompleted={isCompleted} isCurrent={isCurrent} index={index} compact={compact} />
            </div>

            <div className={cn("flex min-w-0 flex-col justify-center", compact ? "pt-0.5" : "pt-1.5")}>
              <span
                className={cn(
                  "font-medium leading-tight",
                  compact ? "text-[13.5px]" : "text-sm",
                  isCurrent && "text-neon-cyan",
                  isCompleted && "text-text-primary",
                  isFuture && "text-text-tertiary"
                )}
              >
                {label}
              </span>
              {isCurrent && (
                <span className={cn("text-text-tertiary", compact ? "text-[11px]" : "text-xs")}>En progreso</span>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export { Timeline }
