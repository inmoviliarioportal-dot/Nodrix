import { cn } from "@/lib/utils"

/**
 * Barra de progreso global del proceso ("X de 9 pasos completados, ~Y%") —
 * más fácil de escanear de un vistazo que la lista vertical completa de
 * etapas. `completedSteps` es el número de etapas YA superadas (no cuenta la
 * etapa actual como completada, solo las anteriores).
 */
function StageProgressBar({ completedSteps, totalSteps }: { completedSteps: number; totalSteps: number }) {
  const clamped = Math.max(0, Math.min(completedSteps, totalSteps))
  const percent = Math.round((clamped / totalSteps) * 100)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs text-text-secondary">
        <span>
          {clamped} de {totalSteps} pasos completados
        </span>
        <span className="font-medium text-text-primary">{percent}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-glass-border">
        <div
          className={cn("glow-cyan h-full rounded-full bg-neon-cyan transition-all duration-500")}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

export { StageProgressBar }
