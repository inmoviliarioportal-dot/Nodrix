"use client"

import * as React from "react"

import { APPLICATION_STAGES, STAGE_LABELS } from "@/components/dashboard/types"
import { MOCK_ADVISOR_PERFORMANCE } from "@/components/admin/types"

const CATEGORIES = ["Todas", "BRONCE", "PLATA", "ORO", "PLATINO"] as const

function fieldClass() {
  return "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm text-text-primary outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
}

export interface ReportFiltersState {
  from: string
  to: string
  advisor: string
  stage: string
  category: string
}

interface ReportFiltersProps {
  value: ReportFiltersState
  onChange: (next: ReportFiltersState) => void
}

/** Filtros de la página de Reportes — puramente client-side, filtran las secciones mock. */
export function ReportFilters({ value, onChange }: ReportFiltersProps) {
  function set<K extends keyof ReportFiltersState>(key: K, v: ReportFiltersState[K]) {
    onChange({ ...value, [key]: v })
  }

  return (
    <div className="glass-card rounded-2xl p-5 print:hidden">
      <h3 className="text-sm font-semibold text-text-primary">Filtros</h3>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-text-secondary" htmlFor="report-from">
            Desde
          </label>
          <input
            id="report-from"
            type="date"
            className={fieldClass()}
            value={value.from}
            onChange={(e) => set("from", e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-text-secondary" htmlFor="report-to">
            Hasta
          </label>
          <input
            id="report-to"
            type="date"
            className={fieldClass()}
            value={value.to}
            onChange={(e) => set("to", e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-text-secondary" htmlFor="report-advisor">
            Asesor
          </label>
          <select
            id="report-advisor"
            className={fieldClass()}
            value={value.advisor}
            onChange={(e) => set("advisor", e.target.value)}
          >
            <option value="Todos">Todos</option>
            {MOCK_ADVISOR_PERFORMANCE.map((a) => (
              <option key={a.advisor} value={a.advisor}>
                {a.advisor}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-text-secondary" htmlFor="report-stage">
            Estado
          </label>
          <select
            id="report-stage"
            className={fieldClass()}
            value={value.stage}
            onChange={(e) => set("stage", e.target.value)}
          >
            <option value="Todos">Todos</option>
            {APPLICATION_STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {STAGE_LABELS[stage]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-1">
          <label className="text-xs text-text-secondary" htmlFor="report-category">
            Categoría de scoring
          </label>
          <select
            id="report-category"
            className={fieldClass()}
            value={value.category}
            onChange={(e) => set("category", e.target.value)}
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
