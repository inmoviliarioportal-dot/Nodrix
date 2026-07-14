"use client"

import { EyeIcon, ArrowRightIcon, CheckCircle2Icon } from "lucide-react"

import { STAGE_LABELS } from "@/components/dashboard/types"
import { MOCK_TOP_LEADS } from "@/components/admin/types"

const CATEGORY_CLASS: Record<string, string> = {
  BRONCE: "bg-bronce/15 text-bronce border-bronce/30",
  PLATA: "bg-plata/15 text-plata border-plata/30",
  ORO: "bg-oro/15 text-oro border-oro/30",
  PLATINO: "bg-platino/15 text-platino border-platino/30",
}

/** Tabla de Top 10 leads con acciones inline (decorativas — sin backend aún). */
export function TopLeadsTable() {
  function handleAction(action: string, id: string) {
    // Placeholder: Release 3 aún no conecta acciones inline a mutaciones reales.
    console.info(`[admin/dashboard] acción "${action}" solicitada para ${id}`)
  }

  return (
    <div className="glass-card rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-text-primary">Top 10 leads</h3>
      <p className="text-xs text-text-tertiary">Leads con mayor prioridad de seguimiento</p>

      <div className="mt-4 w-full overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-text-tertiary">
              <th className="py-2 pr-3 font-medium">Cliente</th>
              <th className="py-2 pr-3 font-medium">Categoría</th>
              <th className="py-2 pr-3 font-medium">Estado</th>
              <th className="py-2 pr-3 font-medium">Días</th>
              <th className="py-2 pl-3 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_TOP_LEADS.map((lead) => (
              <tr key={lead.id} className="border-b border-border/60 last:border-0">
                <td className="py-2.5 pr-3">
                  <div className="font-medium text-text-primary">{lead.client}</div>
                  <div className="text-xs text-text-tertiary">{lead.id}</div>
                </td>
                <td className="py-2.5 pr-3">
                  <span
                    className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${CATEGORY_CLASS[lead.category]}`}
                  >
                    {lead.category}
                  </span>
                </td>
                <td className="py-2.5 pr-3 text-text-secondary">{STAGE_LABELS[lead.stage] ?? lead.stage}</td>
                <td className="py-2.5 pr-3 text-text-secondary" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {lead.daysInStage}
                </td>
                <td className="py-2.5 pl-3">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleAction("view", lead.id)}
                      className="rounded-md p-1.5 text-text-tertiary transition-colors duration-200 hover:bg-surface-elevated hover:text-neon-cyan"
                      title="Ver detalle"
                    >
                      <EyeIcon className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAction("move", lead.id)}
                      className="rounded-md p-1.5 text-text-tertiary transition-colors duration-200 hover:bg-surface-elevated hover:text-neon-purple"
                      title="Mover de estado"
                    >
                      <ArrowRightIcon className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAction("close", lead.id)}
                      className="rounded-md p-1.5 text-text-tertiary transition-colors duration-200 hover:bg-surface-elevated hover:text-neon-green"
                      title="Cerrar"
                    >
                      <CheckCircle2Icon className="size-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
