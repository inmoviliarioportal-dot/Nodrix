import { Building2Icon } from "lucide-react"

import { InfoTooltip } from "@/components/admin/InfoTooltip"

export interface PropertiesInventoryData {
  total: number
  available: number
  reserved: number
  sold: number
}

/** Inventario de propiedades: disponibles, reservadas (ligadas a
 * solicitudes activas) y vendidas (ligadas a solicitudes en CIERRE) --
 * data REAL, ver GET /api/admin/kpis. */
export function PropertiesInventoryCard({ inventory }: { inventory: PropertiesInventoryData }) {
  const rows = [
    { label: "Disponibles", value: inventory.available, color: "text-neon-green" },
    { label: "Reservadas", value: inventory.reserved, color: "text-gold" },
    { label: "Vendidas", value: inventory.sold, color: "text-neon-purple" },
  ]

  return (
    <div className="glass-surface animate-fade-in rounded-2xl p-5">
      <div className="flex items-center gap-2">
        <Building2Icon className="size-4 text-neon-cyan" aria-hidden="true" />
        <h2 className="text-xs font-bold uppercase tracking-wide text-text-tertiary">Inventario de propiedades</h2>
        <InfoTooltip
          what="Cuántas propiedades del catálogo están disponibles, cuántas reservadas (ligadas a una solicitud activa) y cuántas vendidas (ligadas a una solicitud en Cierre)."
          how="Reservadas = propiedades ligadas a solicitudes activas que aún no llegaron a Cierre. Vendidas = ligadas a solicitudes en Cierre. Disponibles = el resto del catálogo marcado como available."
        />
      </div>
      <p
        className="mt-3 font-heading text-[27px] font-semibold leading-none tracking-tight text-text-primary"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {inventory.total}
      </p>
      <p className="mt-1 text-[11.5px] text-text-tertiary">propiedades en el inventario</p>

      <div className="mt-3.5 flex flex-col gap-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between rounded-lg bg-deep px-2.5 py-2">
            <span className="text-xs font-semibold text-text-secondary">{row.label}</span>
            <span className={`font-heading text-[13px] font-semibold ${row.color}`} style={{ fontVariantNumeric: "tabular-nums" }}>
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
