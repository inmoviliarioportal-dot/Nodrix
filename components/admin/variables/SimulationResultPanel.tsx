"use client"

import { cn } from "@/lib/utils"

export interface SimulationResult {
  draftVersion: number
  simulatedAt: string
  totalAnalyzed: number
  insufficientData: number
  changed: number
  averageDeltaUF: number
  newlyDisqualified: number
  newlyQualified: number
  maxDropUF: number
  maxDropApplicationId: string | null
  byAgeTier: Record<string, number>
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: React.ReactNode
  tone?: "default" | "success" | "error"
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-glass-border bg-surface-elevated/60 p-3">
      <span className="text-xs uppercase tracking-wide text-text-tertiary">{label}</span>
      <span
        className={cn(
          "text-xl font-semibold",
          tone === "success" && "text-status-success",
          tone === "error" && "text-status-error",
          (!tone || tone === "default") && "text-text-primary"
        )}
      >
        {value}
      </span>
    </div>
  )
}

export function SimulationResultPanel({ result }: { result: SimulationResult }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Solicitudes analizadas" value={result.totalAnalyzed} />
        <Stat label="Sin datos suficientes" value={result.insufficientData} />
        <Stat label="Cambian de monto" value={result.changed} />
        <Stat label="Variación promedio (UF)" value={result.averageDeltaUF.toFixed(2)} />
        <Stat label="Dejan de calificar" value={result.newlyDisqualified} tone="error" />
        <Stat label="Pasan a calificar" value={result.newlyQualified} tone="success" />
        <Stat label="Mayor caída individual (UF)" value={result.maxDropUF.toFixed(2)} tone={result.maxDropUF > 0 ? "error" : "default"} />
      </div>

      <div className="flex flex-col gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
          Desglose por tramo de edad efectiva
        </h4>
        <div className="flex flex-wrap gap-2">
          {Object.entries(result.byAgeTier).length === 0 ? (
            <span className="text-xs text-text-tertiary">Sin datos.</span>
          ) : (
            Object.entries(result.byAgeTier).map(([tier, count]) => (
              <span
                key={tier}
                className="rounded-full border border-glass-border bg-surface-elevated px-2.5 py-1 text-xs text-text-secondary"
              >
                {tier}: <span className="font-medium text-text-primary">{count}</span>
              </span>
            ))
          )}
        </div>
      </div>

      <p className="text-xs text-text-tertiary">
        Simulado el {new Date(result.simulatedAt).toLocaleString("es-CL")} sobre el borrador v{result.draftVersion}.
      </p>
    </div>
  )
}
