import { Mail, Phone } from "lucide-react"

import { ScoringBadge, type ScoringCategory } from "@/components/ui/scoring-badge"
import type { ApplicationRow, CustomerRow } from "@/lib/leads"
import { STAGE_LABELS, maskRut } from "./types"

function isScoringCategory(value: unknown): value is ScoringCategory {
  return value === "BRONCE" || value === "PLATA" || value === "ORO" || value === "PLATINO" || value === "BLACK"
}

interface DetailHeaderProps {
  application: ApplicationRow
  customer: CustomerRow | null
}

/** Encabezado de solo-lectura de la vista detalle: identidad del cliente,
 * scoring destacado (con glow) y stage actual. */
function DetailHeader({ application, customer }: DetailHeaderProps) {
  const category = isScoringCategory(application.scoring_category)
    ? application.scoring_category
    : null

  return (
    <div className="glass-card rounded-xl p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-heading text-xl font-semibold text-text-primary sm:text-2xl">
            {customer?.name ?? "Cliente sin nombre"}
          </h1>
          <p className="text-xs text-text-tertiary">{maskRut(customer)}</p>
          <div className="mt-1 flex flex-col gap-1 text-sm text-text-secondary sm:flex-row sm:items-center sm:gap-4">
            {customer?.email && (
              <span className="flex items-center gap-1.5">
                <Mail className="size-3.5 text-text-tertiary" />
                {customer.email}
              </span>
            )}
            {customer?.phone && (
              <span className="flex items-center gap-1.5">
                <Phone className="size-3.5 text-text-tertiary" />
                {customer.phone}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          {category ? (
            <div className={category === "ORO" ? "glow-cyan rounded-full" : category === "PLATINO" ? "glow-purple rounded-full" : ""}>
              <ScoringBadge category={category} className="h-8 px-4 text-sm" />
            </div>
          ) : (
            <span className="text-xs text-text-tertiary">Sin scoring aún</span>
          )}
          <span className="rounded-full border border-glass-border bg-glass px-3 py-1 text-xs text-text-secondary">
            Estado: {STAGE_LABELS[application.stage as keyof typeof STAGE_LABELS] ?? application.stage}
          </span>
        </div>
      </div>
    </div>
  )
}

export { DetailHeader }
