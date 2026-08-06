import { formatCLP } from "@/components/admin/types"
import { UF_VALUE_CLP } from "@/lib/uf-preevaluation"
import { InfoTooltip } from "@/components/admin/InfoTooltip"

export interface ClosureDetailData {
  id: string
  client: string
  date: string
  uf: number
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" })
}

/** Detalle de cierres del mes en curso, con el valor UF de la(s)
 * propiedad(es) ligadas -- data REAL, ver GET /api/admin/kpis. */
export function ClosuresDetailTable({ closures }: { closures: ClosureDetailData[] }) {
  return (
    <div className="glass-card animate-fade-in rounded-2xl p-5">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-text-primary">
        Cierres del mes
        <InfoTooltip
          what="Listado detallado de cada solicitud que llegó a Cierre en el periodo, con la fecha y el valor UF de la propiedad ligada."
          how="Filtra solicitudes con stage = 'CIERRE' y updated_at dentro del mes en curso (o del rango filtrado en Reportes). El valor UF se convierte a CLP con la UF vigente."
        />
      </h3>
      <p className="text-xs text-text-tertiary">Solicitudes que llegaron a Cierre en el periodo actual</p>

      {closures.length === 0 ? (
        <p className="mt-4 text-sm text-text-tertiary">Todavía no hay cierres este mes.</p>
      ) : (
        <div className="mt-4 w-full overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-text-tertiary">
                <th className="py-2 pr-3 font-medium">Cliente</th>
                <th className="py-2 pr-3 font-medium">Fecha</th>
                <th className="py-2 pr-3 text-right font-medium">UF</th>
                <th className="py-2 pl-3 text-right font-medium">Valor estimado</th>
              </tr>
            </thead>
            <tbody>
              {closures.map((c) => (
                <tr key={c.id} className="border-b border-border/60 last:border-0">
                  <td className="py-2.5 pr-3 font-medium text-text-primary">{c.client}</td>
                  <td className="py-2.5 pr-3 text-text-secondary">{formatDate(c.date)}</td>
                  <td className="py-2.5 pr-3 text-right text-text-secondary" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {c.uf.toLocaleString("es-CL")}
                  </td>
                  <td className="py-2.5 pl-3 text-right font-semibold text-neon-cyan" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {formatCLP(Math.round(c.uf * UF_VALUE_CLP))}
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
