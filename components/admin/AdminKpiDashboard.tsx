"use client"

import * as React from "react"
import { RefreshCwIcon } from "lucide-react"

import { KpiCards, type KpiSummaryData } from "@/components/admin/KpiCards"
import { ConversionFunnel, type FunnelStageData } from "@/components/admin/ConversionFunnel"
import { ScoringDistribution, type ScoringDistributionData } from "@/components/admin/ScoringDistribution"
import { ConversionTimeline, type TimelinePointData } from "@/components/admin/ConversionTimeline"
import { TopLeadsTable, type TopLeadData } from "@/components/admin/TopLeadsTable"
import { DeviationsPanel, type DeviationData } from "@/components/admin/DeviationsPanel"
import { AdvisorPerformanceTable, type AdvisorPerformanceData } from "@/components/admin/AdvisorPerformanceTable"
import { PropertiesInventoryCard, type PropertiesInventoryData } from "@/components/admin/PropertiesInventoryCard"
import { ClosuresDetailTable, type ClosureDetailData } from "@/components/admin/ClosuresDetailTable"
import { ApplicationsSummary } from "@/components/admin/ApplicationsSummary"

interface KpiResponse {
  summary: KpiSummaryData & { totalApplications: number; activeApplications: number; closedThisMonthCount: number }
  funnel: FunnelStageData[]
  scoringDistribution: ScoringDistributionData[]
  timeline: TimelinePointData[]
  topLeads: TopLeadData[]
  deviations: DeviationData[]
  advisorPerformance: AdvisorPerformanceData[]
  propertiesInventory: PropertiesInventoryData
  closuresDetail: ClosureDetailData[]
}

/**
 * Orquesta un solo fetch a GET /api/admin/kpis y reparte los datos REALES
 * (no mock) a cada panel del dashboard ejecutivo. Antes cada componente
 * importaba su propio mock desde components/admin/types.ts -- ahora esa
 * responsabilidad la tiene el backend (ver ese endpoint para el detalle de
 * cómo se calcula cada métrica).
 */
export function AdminKpiDashboard() {
  const [data, setData] = React.useState<KpiResponse | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(false)

  const load = React.useCallback(() => {
    setLoading(true)
    setError(false)
    fetch("/api/admin/kpis")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("fetch failed"))))
      .then((json) => setData(json))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  React.useEffect(() => {
    load()
  }, [load])

  if (loading && !data) {
    return (
      <div className="glass-surface flex items-center justify-center rounded-2xl p-12 text-sm text-text-tertiary">
        Calculando métricas...
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="glass-surface flex flex-col items-center gap-3 rounded-2xl p-12 text-center text-sm text-text-tertiary">
        No se pudieron calcular las métricas.
        <button
          type="button"
          onClick={load}
          className="flex items-center gap-1.5 rounded-full border border-glass-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors duration-200 hover:text-text-primary"
        >
          <RefreshCwIcon className="size-3.5" aria-hidden="true" />
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-tertiary">
          {data.summary.totalApplications} solicitudes totales · {data.summary.activeApplications} activas ·{" "}
          {data.summary.closedThisMonthCount} cerradas este mes
        </p>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-full border border-glass-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors duration-200 hover:text-text-primary disabled:opacity-50"
        >
          <RefreshCwIcon className={`size-3.5 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
          Actualizar
        </button>
      </div>

      <KpiCards summary={data.summary} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
        <ConversionFunnel funnel={data.funnel} />
        <div className="flex flex-col gap-4">
          <ScoringDistribution distribution={data.scoringDistribution} />
          <PropertiesInventoryCard inventory={data.propertiesInventory} />
        </div>
      </div>

      <ApplicationsSummary />

      <ConversionTimeline timeline={data.timeline} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TopLeadsTable leads={data.topLeads} />
        <DeviationsPanel deviations={data.deviations} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AdvisorPerformanceTable data={data.advisorPerformance} />
        <ClosuresDetailTable closures={data.closuresDetail} />
      </div>
    </div>
  )
}
