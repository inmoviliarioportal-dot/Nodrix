import { TrendingUp } from "lucide-react"

export interface PreEvaluationCardProps {
  minUf?: number | null
  maxUf?: number | null
}

/**
 * Tile compacto de pre-evaluación financiera (rango UF). Funcionalidad real
 * de cálculo es Release 2 -- en Release 1 mostramos el rango si ya vino en
 * la application, o un estado "pendiente revisión" mock.
 */
function PreEvaluationCard({ minUf, maxUf }: PreEvaluationCardProps) {
  const hasRange = typeof minUf === "number" && typeof maxUf === "number"

  return (
    <div className="glass-surface flex flex-col gap-1.5 rounded-xl border border-glass-border p-3">
      <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-text-tertiary">
        <TrendingUp className="size-3.5 text-neon-cyan" aria-hidden="true" />
        Pre-evaluación
      </span>
      <p className="line-clamp-2 text-[12px] leading-snug text-text-secondary">
        {hasRange ? `${minUf.toLocaleString("es-CL")} — ${maxUf!.toLocaleString("es-CL")} UF` : "Pendiente revisión."}
      </p>
    </div>
  )
}

export { PreEvaluationCard }
