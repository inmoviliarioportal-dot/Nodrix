"use client"

import { TrendingUpIcon } from "lucide-react"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { formatCLP } from "@/components/admin/types"
import { UF_VALUE_CLP } from "@/lib/uf-preevaluation"
import { InfoTooltip } from "@/components/admin/InfoTooltip"

export interface ClosingProjectionData {
  bucket: string
  label: string
  count: number
  projectedUf: number
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: ClosingProjectionData }[] }) {
  if (!active || !payload?.length) return null
  const { label, count, projectedUf } = payload[0].payload
  return (
    <div className="glass-surface rounded-lg border border-glass-border px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-text-primary">{label}</p>
      <p className="text-text-tertiary">
        <span className="font-heading font-semibold text-neon-purple">{count}</span> solicitudes
      </p>
      <p className="text-text-tertiary">{formatCLP(Math.round(projectedUf * UF_VALUE_CLP))} estimado</p>
    </div>
  )
}

/**
 * Proyección de cierres -- cuántas solicitudes ACTIVAS se estima que
 * lleguen a CIERRE en cada horizonte de tiempo, y qué UF representan (ver
 * GET /api/admin/kpis: `closingProjections`). El horizonte de cada
 * solicitud se calcula sumando la duración PROMEDIO HISTÓRICA real de cada
 * etapa restante hasta CIERRE (no un promedio único aplicado a todas), así
 * que una solicitud más avanzada en el pipeline proyecta antes.
 */
export function ClosingProjections({ projections }: { projections: ClosingProjectionData[] }) {
  const totalCount = projections.reduce((sum, p) => sum + p.count, 0)
  const totalUf = projections.reduce((sum, p) => sum + p.projectedUf, 0)

  return (
    <div className="glass-card animate-fade-in rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-semibold text-text-primary">Proyección de cierres</h3>
          <InfoTooltip
            what="Cuántas solicitudes activas se estima que lleguen a Cierre en cada horizonte de tiempo, y el valor UF que representan."
            how="Para cada solicitud activa se suma la duración promedio HISTÓRICA real (calculada del propio historial de transiciones) de cada etapa que le falta hasta Cierre, descontando lo que ya lleva en su etapa actual. No es un promedio único aplicado a todas por igual."
          />
        </div>
        <div className="flex items-center gap-1 rounded-full bg-neon-purple/10 px-2.5 py-1 text-xs font-medium text-neon-purple">
          <TrendingUpIcon className="size-3.5" />
          {totalCount} en pipeline
        </div>
      </div>
      <p className="text-xs text-text-tertiary">{formatCLP(Math.round(totalUf * UF_VALUE_CLP))} en UF proyectadas, histórico de duración por etapa</p>

      <div className="mt-4 h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={projections} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" opacity={0.4} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--text-tertiary)", fontSize: 10.5 }}
            />
            <YAxis hide domain={[0, "dataMax"]} allowDecimals={false} />
            <Tooltip cursor={{ fill: "var(--dark-tertiary)", opacity: 0.4 }} content={<ChartTooltip />} />
            <Bar dataKey="count" fill="var(--neon-purple)" radius={[6, 6, 0, 0]} maxBarSize={56} isAnimationActive animationDuration={600} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
