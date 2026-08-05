import { formatCLP } from "@/components/admin/types"
import { STAGE_LABELS } from "@/components/dashboard/types"
import type { KpiSummaryData } from "@/components/admin/KpiCards"
import type { FunnelStageData } from "@/components/admin/ConversionFunnel"
import type { AdvisorPerformanceData } from "@/components/admin/AdvisorPerformanceTable"
import type { PropertiesInventoryData } from "@/components/admin/PropertiesInventoryCard"
import type { ClosureDetailData } from "@/components/admin/ClosuresDetailTable"

export interface ReportData {
  summary: KpiSummaryData & { totalApplications: number; activeApplications: number; closedThisMonthCount: number }
  funnel: FunnelStageData[]
  advisorPerformance: AdvisorPerformanceData[]
  propertiesInventory: PropertiesInventoryData
  closuresDetail: ClosureDetailData[]
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" })
}

/**
 * Secciones de contenido del reporte -- data REAL (ver GET /api/admin/kpis,
 * ya filtrada según app/admin/reports/page.tsx). Print-friendly: ancho
 * 100%, sin sidebars, se apoya en `print:` utilities.
 */
export function ReportSections({ data }: { data: ReportData }) {
  const { summary, funnel, advisorPerformance, propertiesInventory, closuresDetail } = data
  const totalInFunnel = funnel[0]?.count ?? 0

  return (
    <div className="flex flex-col gap-4">
      {/* Lead summary */}
      <section className="glass-surface rounded-2xl p-5 print:border-0 print:bg-transparent">
        <h3 className="text-sm font-semibold text-text-primary">Resumen de leads</h3>
        <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-text-tertiary">Total en el filtro</p>
            <p className="font-heading text-xl font-semibold text-text-primary" style={{ fontVariantNumeric: "tabular-nums" }}>
              {summary.totalApplications}
            </p>
          </div>
          <div>
            <p className="text-xs text-text-tertiary">Activas</p>
            <p className="font-heading text-xl font-semibold text-neon-cyan" style={{ fontVariantNumeric: "tabular-nums" }}>
              {summary.activeApplications}
            </p>
          </div>
          <div>
            <p className="text-xs text-text-tertiary">Conversión</p>
            <p className="font-heading text-xl font-semibold text-text-primary" style={{ fontVariantNumeric: "tabular-nums" }}>
              {summary.conversionRate.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-xs text-text-tertiary">Días prom. a cierre</p>
            <p className="font-heading text-xl font-semibold text-text-primary" style={{ fontVariantNumeric: "tabular-nums" }}>
              {summary.avgDaysToClose}
            </p>
          </div>
        </div>
      </section>

      {/* Conversion funnel */}
      <section className="glass-surface rounded-2xl p-5 print:border-0 print:bg-transparent">
        <h3 className="text-sm font-semibold text-text-primary">Funnel de conversión</h3>
        <table className="mt-3 w-full min-w-[420px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-text-tertiary">
              <th className="py-1.5 pr-3 font-medium">Estado</th>
              <th className="py-1.5 pr-3 font-medium">Leads</th>
              <th className="py-1.5 pr-3 font-medium">% del total</th>
            </tr>
          </thead>
          <tbody>
            {funnel.map((s) => (
              <tr key={s.stage} className="border-b border-border/60 last:border-0">
                <td className="py-1.5 pr-3 text-text-secondary">{STAGE_LABELS[s.stage] ?? s.stage}</td>
                <td className="py-1.5 pr-3 text-text-primary" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {s.count}
                </td>
                <td className="py-1.5 pr-3 text-text-tertiary" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {totalInFunnel > 0 ? ((s.count / totalInFunnel) * 100).toFixed(1) : "0.0"}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Performance by advisor */}
      <section className="glass-surface rounded-2xl p-5 print:border-0 print:bg-transparent">
        <h3 className="text-sm font-semibold text-text-primary">Rendimiento por asesor</h3>
        {advisorPerformance.length === 0 ? (
          <p className="mt-3 text-sm text-text-tertiary">No hay leads asignados a asesores en este filtro.</p>
        ) : (
          <table className="mt-3 w-full min-w-[480px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-text-tertiary">
                <th className="py-1.5 pr-3 font-medium">Asesor</th>
                <th className="py-1.5 pr-3 font-medium">Leads asignados</th>
                <th className="py-1.5 pr-3 font-medium">Cierres</th>
                <th className="py-1.5 pr-3 font-medium">Conversión</th>
              </tr>
            </thead>
            <tbody>
              {[...advisorPerformance]
                .sort((a, b) => b.conversionRate - a.conversionRate)
                .map((a, i) => (
                  <tr key={a.advisor} className="border-b border-border/60 last:border-0">
                    <td className="py-1.5 pr-3 text-text-primary">
                      <span className="mr-1.5 text-text-tertiary">#{i + 1}</span>
                      {a.advisor}
                    </td>
                    <td className="py-1.5 pr-3 text-text-secondary" style={{ fontVariantNumeric: "tabular-nums" }}>
                      {a.leadsAssigned}
                    </td>
                    <td className="py-1.5 pr-3 text-text-secondary" style={{ fontVariantNumeric: "tabular-nums" }}>
                      {a.closures}
                    </td>
                    <td className="py-1.5 pr-3 font-medium text-neon-green" style={{ fontVariantNumeric: "tabular-nums" }}>
                      {a.conversionRate.toFixed(1)}%
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Revenue projection */}
        <section className="glass-surface rounded-2xl p-5 print:border-0 print:bg-transparent">
          <h3 className="text-sm font-semibold text-text-primary">UF gestionadas (proyección)</h3>
          <p className="mt-3 font-heading text-2xl font-semibold text-gold" style={{ fontVariantNumeric: "tabular-nums" }}>
            {formatCLP(summary.revenueThisMonth)}
          </p>
          <p className="mt-1 text-xs text-text-tertiary">
            Valor UF de propiedades cerradas este mes -- no es una comisión real (el modelo de datos no guarda un %
            de comisión), es el valor de las propiedades gestionadas.
          </p>
        </section>

        {/* Properties inventory */}
        <section className="glass-surface rounded-2xl p-5 print:border-0 print:bg-transparent">
          <h3 className="text-sm font-semibold text-text-primary">Inventario de propiedades</h3>
          <div className="mt-3 grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="font-heading text-lg font-semibold text-text-primary">{propertiesInventory.available}</p>
              <p className="text-xs text-text-tertiary">Disponibles</p>
            </div>
            <div>
              <p className="font-heading text-lg font-semibold text-text-primary">{propertiesInventory.reserved}</p>
              <p className="text-xs text-text-tertiary">Reservadas</p>
            </div>
            <div>
              <p className="font-heading text-lg font-semibold text-text-primary">{propertiesInventory.sold}</p>
              <p className="text-xs text-text-tertiary">Vendidas</p>
            </div>
          </div>
        </section>
      </div>

      {/* Closures detail */}
      <section className="glass-surface rounded-2xl p-5 print:border-0 print:bg-transparent">
        <h3 className="text-sm font-semibold text-text-primary">Detalle de cierres</h3>
        {closuresDetail.length === 0 ? (
          <p className="mt-3 text-sm text-text-tertiary">No hay cierres en este filtro.</p>
        ) : (
          <table className="mt-3 w-full min-w-[420px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-text-tertiary">
                <th className="py-1.5 pr-3 font-medium">Cliente</th>
                <th className="py-1.5 pr-3 font-medium">Fecha</th>
                <th className="py-1.5 pr-3 font-medium">UF</th>
              </tr>
            </thead>
            <tbody>
              {closuresDetail.map((c) => (
                <tr key={c.id} className="border-b border-border/60 last:border-0">
                  <td className="py-1.5 pr-3 text-text-primary">{c.client}</td>
                  <td className="py-1.5 pr-3 text-text-tertiary">{formatDate(c.date)}</td>
                  <td className="py-1.5 pr-3 text-text-primary" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {c.uf.toLocaleString("es-CL")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
