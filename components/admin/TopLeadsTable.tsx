"use client"

import Link from "next/link"
import { EyeIcon } from "lucide-react"

import { STAGE_LABELS } from "@/components/dashboard/types"
import { InfoTooltip } from "@/components/admin/InfoTooltip"

const CATEGORY_CLASS: Record<string, string> = {
  BRONCE: "bg-bronce/15 text-bronce border-bronce/30",
  PLATA: "bg-plata/15 text-plata border-plata/30",
  ORO: "bg-oro/15 text-oro border-oro/30",
  PLATINO: "bg-platino/15 text-platino border-platino/30",
  BLACK: "bg-neon-purple/15 text-neon-purple border-neon-purple/30",
  SIN_SCORING: "bg-text-tertiary/15 text-text-tertiary border-text-tertiary/30",
}

export interface TopLeadData {
  id: string
  client: string
  category: string
  stage: string
  daysInStage: number
}

/** Tabla de Top 10 leads que más urgen seguimiento (más días sin avanzar de
 * etapa entre las solicitudes activas), data REAL -- ver GET /api/admin/kpis. */
export function TopLeadsTable({ leads }: { leads: TopLeadData[] }) {
  return (
    <div className="glass-card animate-fade-in rounded-2xl p-5">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-text-primary">
        Top 10 leads que requieren seguimiento
        <InfoTooltip
          what="Las 10 solicitudes ACTIVAS (no cerradas) que llevan más tiempo sin avanzar de etapa -- las que más urgen contacto del asesor."
          how="Para cada solicitud activa, calcula los días desde su última actualización hasta hoy y ordena de mayor a menor, tomando el top 10."
        />
      </h3>
      <p className="text-xs text-text-tertiary">Solicitudes activas con más días sin avanzar de etapa</p>

      {leads.length === 0 ? (
        <p className="mt-4 text-sm text-text-tertiary">No hay solicitudes activas todavía.</p>
      ) : (
        <div className="mt-4 w-full overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-text-tertiary">
                <th className="py-2 pr-3 font-medium">Cliente</th>
                <th className="py-2 pr-3 font-medium">Categoría</th>
                <th className="py-2 pr-3 font-medium">Estado</th>
                <th className="py-2 pr-3 font-medium">Días sin avanzar</th>
                <th className="py-2 pl-3 text-right font-medium">Acción</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr
                  key={lead.id}
                  className="interactive-lift border-b border-border/60 transition-colors duration-200 last:border-0 hover:bg-surface-elevated/60"
                >
                  <td className="py-2.5 pr-3">
                    <div className="font-medium text-text-primary">{lead.client}</div>
                    <div className="text-xs text-text-tertiary">{lead.id.slice(0, 8)}</div>
                  </td>
                  <td className="py-2.5 pr-3">
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${CATEGORY_CLASS[lead.category] ?? CATEGORY_CLASS.SIN_SCORING}`}
                    >
                      {lead.category === "SIN_SCORING" ? "Sin scoring" : lead.category}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 text-text-secondary">{STAGE_LABELS[lead.stage] ?? lead.stage}</td>
                  <td className="py-2.5 pr-3 text-text-secondary" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {lead.daysInStage}
                  </td>
                  <td className="py-2.5 pl-3">
                    <div className="flex items-center justify-end">
                      <Link
                        href={`/backoffice/${lead.id}`}
                        className="flex items-center gap-1.5 rounded-md p-1.5 text-text-tertiary transition-colors duration-200 hover:bg-surface-elevated hover:text-neon-cyan"
                        title="Ver detalle"
                      >
                        <EyeIcon className="size-4" />
                      </Link>
                    </div>
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
