export interface AdvisorPerformanceData {
  advisor: string
  leadsAssigned: number
  closures: number
  conversionRate: number
}

/** Desempeño por asesor (leads asignados, cierres, tasa de conversión) --
 * data REAL, ver GET /api/admin/kpis. */
export function AdvisorPerformanceTable({ data }: { data: AdvisorPerformanceData[] }) {
  return (
    <div className="glass-card animate-fade-in rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-text-primary">Desempeño por asesor</h3>
      <p className="text-xs text-text-tertiary">Leads asignados, cierres y tasa de conversión</p>

      {data.length === 0 ? (
        <p className="mt-4 text-sm text-text-tertiary">Todavía no hay leads asignados a asesores.</p>
      ) : (
        <div className="mt-4 w-full overflow-x-auto">
          <table className="w-full min-w-[440px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-text-tertiary">
                <th className="py-2 pr-3 font-medium">Asesor</th>
                <th className="py-2 pr-3 text-right font-medium">Asignados</th>
                <th className="py-2 pr-3 text-right font-medium">Cierres</th>
                <th className="py-2 pl-3 text-right font-medium">Conversión</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.advisor} className="border-b border-border/60 last:border-0">
                  <td className="py-2.5 pr-3 font-medium text-text-primary">{row.advisor}</td>
                  <td className="py-2.5 pr-3 text-right text-text-secondary" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {row.leadsAssigned}
                  </td>
                  <td className="py-2.5 pr-3 text-right text-text-secondary" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {row.closures}
                  </td>
                  <td className="py-2.5 pl-3 text-right font-semibold text-neon-cyan" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {row.conversionRate}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
