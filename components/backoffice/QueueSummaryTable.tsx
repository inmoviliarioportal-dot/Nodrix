"use client"

import { Fragment, useMemo, useState } from "react"
import { AlertTriangleIcon, ChevronDownIcon, ChevronRightIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import type { ApplicationRow } from "@/lib/leads"
import {
  DAYS_BUCKET_LABELS,
  SCORING_CATEGORIES,
  STAGE_LABELS,
  daysInStage,
  type DaysInStageBucket,
  type QueueFilters,
} from "./types"

const STAGE_ORDER = Object.keys(STAGE_LABELS) as (keyof typeof STAGE_LABELS)[]
const DAYS_BUCKETS: DaysInStageBucket[] = ["0-5", "5-10", "10+"]

interface QueueSummaryTableProps {
  applications: ApplicationRow[]
  onDrilldown: (filters: Partial<QueueFilters>) => void
}

interface CellGroup {
  stage: string
  category: string
  apps: ApplicationRow[]
}

/**
 * Vista "hoja de cálculo" de la bandeja: filas por Estado, columnas por
 * Categoría de scoring, con el conteo de "críticas" (>7 días en el estado)
 * junto a cada total de fila. Cada celda es expandible para ver el detalle
 * de días-en-stage sin salir de la página, y cada número también dispara
 * el filtro de la vista de tarjetas (drilldown).
 */
function QueueSummaryTable({ applications, onDrilldown }: QueueSummaryTableProps) {
  const [expanded, setExpanded] = useState<string | null>(null)

  const groups = useMemo(() => {
    const map = new Map<string, ApplicationRow[]>()
    for (const app of applications) {
      const category = app.scoring_category ?? "SIN_SCORING"
      const key = `${app.stage}::${category}`
      const list = map.get(key) ?? []
      list.push(app)
      map.set(key, list)
    }
    return map
  }, [applications])

  const rowTotals = useMemo(() => {
    const totals = new Map<string, { total: number; critical: number }>()
    for (const stage of STAGE_ORDER) {
      const apps = applications.filter((a) => a.stage === stage)
      const critical = apps.filter((a) => daysInStage(a.updated_at) > 7).length
      totals.set(stage, { total: apps.length, critical })
    }
    return totals
  }, [applications])

  function cellApps(stage: string, category: string): ApplicationRow[] {
    return groups.get(`${stage}::${category}`) ?? []
  }

  function toggleExpand(key: string) {
    setExpanded((prev) => (prev === key ? null : key))
  }

  return (
    <div className="glass-card overflow-x-auto rounded-2xl p-4">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-glass-border text-left text-xs font-medium uppercase tracking-wide text-text-tertiary">
            <th className="w-8 py-2" />
            <th className="py-2 pr-2">Estado</th>
            {SCORING_CATEGORIES.map((category) => (
              <th key={category} className="px-2 py-2 text-right">
                {category}
              </th>
            ))}
            <th className="px-2 py-2 text-right">Total</th>
            <th className="px-2 py-2 text-right">
              <span className="inline-flex items-center gap-1 text-error">
                <AlertTriangleIcon className="size-3.5" />
                Críticas
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {STAGE_ORDER.map((stage) => {
            const totals = rowTotals.get(stage) ?? { total: 0, critical: 0 }
            const isExpanded = expanded === stage
            return (
              <Fragment key={stage}>
                <tr className="border-b border-glass-border/50 hover:bg-white/[0.03]">
                  <td className="py-1.5 text-center">
                    <button
                      type="button"
                      onClick={() => toggleExpand(stage)}
                      className="text-text-tertiary transition-colors hover:text-text-primary"
                      aria-label={isExpanded ? "Contraer detalle" : "Expandir detalle"}
                    >
                      {isExpanded ? (
                        <ChevronDownIcon className="size-4" />
                      ) : (
                        <ChevronRightIcon className="size-4" />
                      )}
                    </button>
                  </td>
                  <td className="py-1.5 pr-2 text-text-secondary">
                    {STAGE_LABELS[stage as keyof typeof STAGE_LABELS] ?? stage}
                  </td>
                  {SCORING_CATEGORIES.map((category) => {
                    const count = cellApps(stage, category).length
                    return (
                      <td key={category} className="px-2 py-1.5 text-right">
                        {count > 0 ? (
                          <button
                            type="button"
                            onClick={() => onDrilldown({ stages: [stage as never], categories: [category as never] })}
                            className="font-semibold text-neon-cyan hover:underline"
                          >
                            {count}
                          </button>
                        ) : (
                          <span className="text-text-tertiary/50">0</span>
                        )}
                      </td>
                    )
                  })}
                  <td className="px-2 py-1.5 text-right">
                    <button
                      type="button"
                      onClick={() => onDrilldown({ stages: [stage as never] })}
                      className="font-semibold text-text-primary hover:underline"
                    >
                      {totals.total}
                    </button>
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <span
                      className={cn(
                        "font-semibold",
                        totals.critical > 0 ? "text-error" : "text-text-tertiary/50"
                      )}
                    >
                      {totals.critical}
                    </span>
                  </td>
                </tr>

                {isExpanded && (
                  <tr className="border-b border-glass-border/50 bg-white/[0.02]">
                    <td />
                    <td colSpan={SCORING_CATEGORIES.length + 2} className="py-2 pr-2">
                      <div className="flex flex-wrap gap-4 text-xs text-text-tertiary">
                        {DAYS_BUCKETS.map((bucket) => {
                          const apps = applications.filter(
                            (a) => a.stage === stage && matchesBucket(daysInStage(a.updated_at), bucket)
                          )
                          if (apps.length === 0) return null
                          return (
                            <button
                              key={bucket}
                              type="button"
                              onClick={() => onDrilldown({ stages: [stage as never], daysBucket: bucket })}
                              className="rounded-full border border-glass-border bg-glass px-3 py-1 hover:text-text-primary hover:underline"
                            >
                              {DAYS_BUCKET_LABELS[bucket]}: <span className="font-semibold">{apps.length}</span>
                            </button>
                          )
                        })}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function matchesBucket(days: number, bucket: DaysInStageBucket): boolean {
  if (bucket === "0-5") return days >= 0 && days <= 5
  if (bucket === "5-10") return days > 5 && days <= 10
  return days > 10
}

export { QueueSummaryTable }
