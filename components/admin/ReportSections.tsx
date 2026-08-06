import { formatCLP } from "@/components/admin/types"
import { STAGE_LABELS } from "@/components/dashboard/types"
import type { KpiSummaryData } from "@/components/admin/KpiCards"
import { ConversionFunnel, type FunnelStageData } from "@/components/admin/ConversionFunnel"
import { ScoringDistribution, type ScoringDistributionData } from "@/components/admin/ScoringDistribution"
import { ConversionTimeline, type TimelinePointData } from "@/components/admin/ConversionTimeline"
import { ClosingProjections, type ClosingProjectionData } from "@/components/admin/ClosingProjections"
import type { AdvisorPerformanceData } from "@/components/admin/AdvisorPerformanceTable"
import type { PropertiesInventoryData } from "@/components/admin/PropertiesInventoryCard"
import type { ClosureDetailData } from "@/components/admin/ClosuresDetailTable"
import { InfoTooltip } from "@/components/admin/InfoTooltip"

export interface ReportData {
  summary: KpiSummaryData & { totalApplications: number; activeApplications: number; closedThisMonthCount: number }
  funnel: FunnelStageData[]
  scoringDistribution: ScoringDistributionData[]
  timeline: TimelinePointData[]
  closingProjections: ClosingProjectionData[]
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
  const { summary, funnel, scoringDistribution, timeline, closingProjections, advisorPerformance, propertiesInventory, closuresDetail } = data
  const totalInFunnel = funnel[0]?.count ?? 0

  return (
    <div className="flex flex-col gap-4">
      {/* Lead summary */}
      <section className="glass-surface rounded-2xl p-5 print:border-0 print:bg-transparent">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-text-primary">
          Resumen de leads
          <InfoTooltip
            what="Vista rápida de volumen, actividad, conversión y velocidad del pipeline, sobre el filtro aplicado arriba."
            how="Total/Activas: conteo de solicitudes. Conversión: % que llegó a Cierre. Días prom.: promedio de (actualización − creación) para las ya cerradas."
          />
        </h3>
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

      {/* Charts: funnel de estados, scoring, timeline + proyección */}
      <div className="print:hidden">
        <ConversionFunnel funnel={funnel} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 print:hidden">
        <ScoringDistribution distribution={scoringDistribution} />
        <ClosingProjections projections={closingProjections} />
      </div>

      <div className="print:hidden">
        <ConversionTimeline timeline={timeline} />
      </div>

      {/* Conversion funnel */}
      <section className="glass-surface rounded-2xl p-5 print:border-0 print:bg-transparent">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-text-primary">
          Funnel de Estados
          <InfoTooltip
            what="Cuántas solicitudes alguna vez alcanzaron cada etapa del pipeline, del total filtrado."
            how="Cuenta acumulativa por etapa a partir del historial de transiciones (ver gráfico arriba para el detalle visual)."
          />
        </h3>
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
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-text-primary">
          Rendimiento por asesor
          <InfoTooltip
            what="Leads asignados, cierres y tasa de conversión por asesor, sobre el filtro aplicado."
            how="Conversión = (cierres del asesor ÷ leads asignados al asesor) × 100."
          />
        </h3>
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
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-text-primary">
            UF gestionadas (proyección)
            <InfoTooltip
              what="Valor en UF de las propiedades ligadas a solicitudes cerradas este mes (o en el rango filtrado)."
              how="Suma price_uf de las propiedades seleccionadas/aceptadas en cada solicitud cerrada, convertida a CLP con la UF vigente. No es comisión real."
            />
          </h3>
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
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-text-primary">
            Inventario de propiedades
            <InfoTooltip
              what="Disponibles, reservadas (ligadas a solicitud activa) y vendidas (ligadas a solicitud en Cierre), sobre el catálogo completo."
              how="Reservadas/vendidas se derivan de las propiedades ligadas a solicitudes activas/cerradas; el resto marcado available cuenta como disponible."
            />
          </h3>
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
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-text-primary">
          Detalle de cierres
          <InfoTooltip
            what="Cada solicitud que llegó a Cierre en el filtro aplicado, con fecha y valor UF de la propiedad ligada."
            how="Filtra solicitudes con stage = 'CIERRE' dentro del rango de fechas filtrado (o el mes en curso si no hay filtro de fecha)."
          />
        </h3>
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
