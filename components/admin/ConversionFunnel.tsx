"use client"

import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { STAGE_LABELS } from "@/components/dashboard/types"
import { InfoTooltip } from "@/components/admin/InfoTooltip"

export interface FunnelStageData {
  stage: string
  count: number
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: { label: string; count: number } }[] }) {
  if (!active || !payload?.length) return null
  const { label, count } = payload[0].payload
  return (
    <div className="glass-surface rounded-lg border border-glass-border px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-text-primary">{label}</p>
      <p className="text-text-tertiary">
        <span className="font-heading font-semibold text-neon-cyan">{count}</span> solicitudes
      </p>
    </div>
  )
}

/**
 * Funnel de conversión -- barras horizontales vía Recharts, una por etapa.
 * `funnel[i].count` es ACUMULATIVO: cuántas solicitudes alguna vez
 * alcanzaron esa etapa (ver GET /api/admin/kpis), no solo las que están
 * ahí ahora mismo. El degradado de opacidad refuerza visualmente la caída
 * del embudo etapa a etapa.
 */
export function ConversionFunnel({ funnel }: { funnel: FunnelStageData[] }) {
  const maxCount = Math.max(...funnel.map((s) => s.count), 1)
  const data = funnel.map((s, i) => ({
    label: STAGE_LABELS[s.stage] ?? s.stage,
    count: s.count,
    opacity: 0.45 + (i === 0 ? 0.55 : (0.55 * s.count) / maxCount),
  }))

  return (
    <div className="glass-surface animate-fade-in rounded-2xl p-5">
      <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-text-tertiary">
        Funnel de Estados
        <InfoTooltip
          what="Cuántas solicitudes alguna vez alcanzaron cada etapa del pipeline, del total filtrado. Muestra dónde se concentra la caída del proceso."
          how="Para cada etapa, cuenta solicitudes que aparecen en el historial de transiciones con esa etapa como destino, o cuya etapa actual está igual o más avanzada. Es acumulativo: no solo la foto de hoy."
        />
      </h2>

      <div className="mt-2" style={{ height: Math.max(220, data.length * 34) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 28, bottom: 4, left: 4 }} barCategoryGap={10}>
            <XAxis type="number" hide domain={[0, "dataMax"]} />
            <YAxis
              type="category"
              dataKey="label"
              width={140}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
            />
            <Tooltip cursor={{ fill: "var(--dark-tertiary)", opacity: 0.4 }} content={<ChartTooltip />} />
            <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={20} isAnimationActive animationDuration={600}>
              {data.map((entry, i) => (
                <Cell key={i} fill="var(--neon-cyan)" fillOpacity={entry.opacity} />
              ))}
              <LabelList
                dataKey="count"
                position="right"
                style={{ fill: "var(--text-primary)", fontSize: 11, fontWeight: 600 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
