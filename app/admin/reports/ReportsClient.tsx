"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeftIcon, RefreshCwIcon, InfoIcon } from "lucide-react"

import { Toaster } from "@/components/ui/sonner"
import { ReportFilters, type ReportFiltersState } from "@/components/admin/ReportFilters"
import { ExportButtons } from "@/components/admin/ExportButtons"
import { ReportSections, type ReportData } from "@/components/admin/ReportSections"

const DEFAULT_FILTERS: ReportFiltersState = {
  from: "",
  to: "",
  advisorId: "Todos",
  stage: "Todos",
  category: "Todas",
}

function buildQuery(filters: ReportFiltersState): string {
  const params = new URLSearchParams()
  if (filters.from) params.set("from", filters.from)
  if (filters.to) params.set("to", filters.to)
  if (filters.advisorId !== "Todos") params.set("advisorId", filters.advisorId)
  if (filters.stage !== "Todos") params.set("stage", filters.stage)
  if (filters.category !== "Todas") params.set("category", filters.category)
  return params.toString()
}

/**
 * Reportes ejecutivos exportables -- data REAL (ver GET /api/admin/kpis con
 * filtros por querystring), reemplaza el mock previo. Los filtros disparan
 * un nuevo fetch al backend en vez de solo filtrar un array estático en el
 * cliente. Layout print-friendly: 100% de ancho, sin sidebars adicionales.
 */
export default function AdminReportsPage() {
  const [filters, setFilters] = React.useState<ReportFiltersState>(DEFAULT_FILTERS)
  const [data, setData] = React.useState<ReportData | null>(null)
  const [advisors, setAdvisors] = React.useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(false)

  const load = React.useCallback((currentFilters: ReportFiltersState) => {
    setLoading(true)
    setError(false)
    fetch(`/api/admin/kpis?${buildQuery(currentFilters)}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("fetch failed"))))
      .then((json) => {
        setData(json)
        setAdvisors(json.advisors ?? [])
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  React.useEffect(() => {
    load(filters)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  return (
    <>
      <Toaster />
      <div className="bg-deep-ambient -mx-6 -my-8 min-h-[calc(100vh-4rem)] px-6 py-8 print:m-0 print:bg-none print:p-0">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 print:max-w-full">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
            <div className="flex items-center gap-3">
              <Link
                href="/admin/dashboard"
                className="rounded-lg p-2 text-text-tertiary transition-colors duration-200 hover:bg-glass hover:text-text-primary"
                title="Volver al dashboard"
              >
                <ArrowLeftIcon className="size-5" />
              </Link>
              <div>
                <h1 className="font-heading text-2xl font-semibold tracking-tight text-text-primary">Reportes</h1>
                <p className="text-sm text-text-tertiary">Reportes ejecutivos exportables, en vivo desde la base de datos</p>
              </div>
            </div>
            {data && <ExportButtons data={data} />}
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-glass-border bg-surface-elevated/50 p-3 text-xs text-text-tertiary print:hidden">
            <InfoIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            <p>
              Estos reportes miden leads, conversión, asesores y propiedades -- hoy la plataforma no registra el
              canal/campaña de origen de cada lead (UTM, referido, etc.), así que todavía no es posible desglosar por
              campaña de marketing. Se puede agregar esa captura si la necesitas.
            </p>
          </div>

          <ReportFilters value={filters} onChange={setFilters} advisors={advisors} />

          {loading && !data ? (
            <div className="glass-surface flex items-center justify-center rounded-2xl p-12 text-sm text-text-tertiary">
              Calculando reporte...
            </div>
          ) : error || !data ? (
            <div className="glass-surface flex flex-col items-center gap-3 rounded-2xl p-12 text-center text-sm text-text-tertiary">
              No se pudo calcular el reporte.
              <button
                type="button"
                onClick={() => load(filters)}
                className="flex items-center gap-1.5 rounded-full border border-glass-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors duration-200 hover:text-text-primary"
              >
                <RefreshCwIcon className="size-3.5" aria-hidden="true" />
                Reintentar
              </button>
            </div>
          ) : (
            <ReportSections data={data} />
          )}
        </div>
      </div>
    </>
  )
}
