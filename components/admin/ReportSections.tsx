import {
  formatCLP,
  MOCK_ADVISOR_PERFORMANCE,
  MOCK_CLOSURES_DETAIL,
  MOCK_FUNNEL,
  MOCK_KPI_SUMMARY,
  MOCK_PROPERTIES_INVENTORY,
} from "@/components/admin/types"

/**
 * Secciones de contenido del reporte (renderizado, sin export real aún).
 * Print-friendly: ancho 100%, sin sidebars, se apoya en `print:` utilities.
 */
export function ReportSections() {
  const totalLeads = MOCK_FUNNEL[0]?.count ?? 0
  const totalClosed = MOCK_FUNNEL[MOCK_FUNNEL.length - 1]?.count ?? 0

  return (
    <div className="flex flex-col gap-4">
      {/* Lead summary */}
      <section className="glass-surface rounded-2xl p-5 print:border-0 print:bg-transparent">
        <h3 className="text-sm font-semibold text-text-primary">Resumen de leads</h3>
        <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-text-tertiary">Total leads</p>
            <p className="text-xl font-semibold text-text-primary" style={{ fontVariantNumeric: "tabular-nums" }}>
              {totalLeads}
            </p>
          </div>
          <div>
            <p className="text-xs text-text-tertiary">Cerrados</p>
            <p className="text-xl font-semibold text-neon-green" style={{ fontVariantNumeric: "tabular-nums" }}>
              {totalClosed}
            </p>
          </div>
          <div>
            <p className="text-xs text-text-tertiary">Conversión</p>
            <p className="text-xl font-semibold text-text-primary" style={{ fontVariantNumeric: "tabular-nums" }}>
              {MOCK_KPI_SUMMARY.conversionRate.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-xs text-text-tertiary">Días prom. a cierre</p>
            <p className="text-xl font-semibold text-text-primary" style={{ fontVariantNumeric: "tabular-nums" }}>
              {MOCK_KPI_SUMMARY.avgDaysToClose}
            </p>
          </div>
        </div>

        <table className="mt-4 w-full min-w-[420px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-text-tertiary">
              <th className="py-1.5 pr-3 font-medium">Estado</th>
              <th className="py-1.5 pr-3 font-medium">Leads</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_FUNNEL.map((s) => (
              <tr key={s.stage} className="border-b border-border/60 last:border-0">
                <td className="py-1.5 pr-3 text-text-secondary">{s.label}</td>
                <td className="py-1.5 pr-3 text-text-primary" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {s.count}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Conversion funnel (text table) */}
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
            {MOCK_FUNNEL.map((s) => (
              <tr key={s.stage} className="border-b border-border/60 last:border-0">
                <td className="py-1.5 pr-3 text-text-secondary">{s.label}</td>
                <td className="py-1.5 pr-3 text-text-primary" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {s.count}
                </td>
                <td className="py-1.5 pr-3 text-text-tertiary" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {((s.count / totalLeads) * 100).toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Performance by advisor */}
      <section className="glass-surface rounded-2xl p-5 print:border-0 print:bg-transparent">
        <h3 className="text-sm font-semibold text-text-primary">Rendimiento por asesor</h3>
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
            {[...MOCK_ADVISOR_PERFORMANCE]
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
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Revenue projection */}
        <section className="glass-surface rounded-2xl p-5 print:border-0 print:bg-transparent">
          <h3 className="text-sm font-semibold text-text-primary">Proyección de ingresos (mock)</h3>
          <p className="mt-3 text-2xl font-semibold text-gold" style={{ fontVariantNumeric: "tabular-nums" }}>
            {formatCLP(MOCK_KPI_SUMMARY.revenueThisMonth)}
          </p>
          <p className="mt-1 text-xs text-text-tertiary">
            Estimado en base a comisiones mock × leads en etapa de cierre.
          </p>
        </section>

        {/* Properties inventory */}
        <section className="glass-surface rounded-2xl p-5 print:border-0 print:bg-transparent">
          <h3 className="text-sm font-semibold text-text-primary">Inventario de propiedades</h3>
          <div className="mt-3 grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-lg font-semibold text-text-primary">{MOCK_PROPERTIES_INVENTORY.disponibles}</p>
              <p className="text-xs text-text-tertiary">Disponibles</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-text-primary">{MOCK_PROPERTIES_INVENTORY.reservadas}</p>
              <p className="text-xs text-text-tertiary">Reservadas</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-text-primary">{MOCK_PROPERTIES_INVENTORY.vendidas}</p>
              <p className="text-xs text-text-tertiary">Vendidas</p>
            </div>
          </div>
        </section>
      </div>

      {/* Closures detail */}
      <section className="glass-surface rounded-2xl p-5 print:border-0 print:bg-transparent">
        <h3 className="text-sm font-semibold text-text-primary">Detalle de cierres</h3>
        <table className="mt-3 w-full min-w-[420px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-text-tertiary">
              <th className="py-1.5 pr-3 font-medium">Lead</th>
              <th className="py-1.5 pr-3 font-medium">Cliente</th>
              <th className="py-1.5 pr-3 font-medium">Fecha</th>
              <th className="py-1.5 pr-3 font-medium">UF</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_CLOSURES_DETAIL.map((c) => (
              <tr key={c.id} className="border-b border-border/60 last:border-0">
                <td className="py-1.5 pr-3 text-text-secondary">{c.id}</td>
                <td className="py-1.5 pr-3 text-text-primary">{c.client}</td>
                <td className="py-1.5 pr-3 text-text-tertiary">{c.date}</td>
                <td className="py-1.5 pr-3 text-text-primary" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {c.uf.toLocaleString("es-CL")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
