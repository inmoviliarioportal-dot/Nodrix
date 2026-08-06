import { TrendingUpIcon, PercentIcon, ClockIcon, WalletIcon, CalendarClockIcon } from "lucide-react"

import { formatCLP } from "@/components/admin/types"
import { UF_VALUE_CLP } from "@/lib/uf-preevaluation"
import { InfoTooltip } from "@/components/admin/InfoTooltip"

export interface KpiSummaryData {
  totalLeadsThisMonth: number
  leadsMomChangePct: number | null
  conversionRate: number
  avgDaysToClose: number
  revenueThisMonth: number
  revenueMomChangePct: number | null
  projectedNext30DaysCount?: number
  projectedNext30DaysUf?: number
}

interface KpiCardDef {
  label: string
  value: string
  hint: string
  what: string
  how: string
  icon: React.ComponentType<{ className?: string }>
  accent: "cyan" | "purple" | "green" | "gold"
}

function accentClass(accent: KpiCardDef["accent"]) {
  switch (accent) {
    case "cyan":
      return "text-neon-cyan"
    case "purple":
      return "text-neon-purple"
    case "green":
      return "text-neon-green"
    default:
      return "text-gold"
  }
}

function iconBgClass(accent: KpiCardDef["accent"]) {
  switch (accent) {
    case "cyan":
      return "bg-neon-cyan/10"
    case "purple":
      return "bg-neon-purple/10"
    case "green":
      return "bg-neon-green/10"
    default:
      return "bg-gold/10"
  }
}

function momHint(label: string, pct: number | null): string {
  if (pct === null) return label
  const sign = pct >= 0 ? "+" : ""
  return `${label} · ${sign}${pct.toFixed(0)}% vs. mes anterior`
}

/**
 * Top 4 KPI cards del Admin Dashboard -- data REAL (ver GET /api/admin/kpis),
 * cards compactas y neutras (`glass-surface`), con UN solo acento de color
 * por card aplicado solo al icono y al número.
 */
export function KpiCards({ summary }: { summary: KpiSummaryData }) {
  const cards: KpiCardDef[] = [
    {
      label: "Leads este mes",
      value: summary.totalLeadsThisMonth.toLocaleString("es-CL"),
      hint: momHint("Total capturados en el periodo", summary.leadsMomChangePct),
      what: "Cuántas solicitudes se crearon desde el día 1 del mes en curso hasta hoy, y su variación contra el mismo periodo del mes anterior.",
      how: "Cuenta applications.created_at dentro del mes en curso. La variación % compara ese total contra el mismo rango de días del mes anterior.",
      icon: TrendingUpIcon,
      accent: "cyan",
    },
    {
      label: "Tasa de conversión",
      value: `${summary.conversionRate.toFixed(1)}%`,
      hint: "Recepcionada → Cierre, histórico",
      what: "Qué porcentaje de TODAS las solicitudes (histórico completo, no solo este mes) llegó finalmente a la etapa Cierre.",
      how: "(N.° de solicitudes en etapa CIERRE ÷ N.° total de solicitudes) × 100, sobre el universo filtrado.",
      icon: PercentIcon,
      accent: "purple",
    },
    {
      label: "Días promedio a cierre",
      value: `${summary.avgDaysToClose}`,
      hint: "Desde recepción hasta cierre",
      what: "Cuántos días, en promedio, tarda una solicitud desde que se recibe hasta que llega a Cierre.",
      how: "Promedio de (fecha de última actualización − fecha de creación) sobre todas las solicitudes que ya llegaron a CIERRE.",
      icon: ClockIcon,
      accent: "green",
    },
    {
      label: "UF gestionadas este mes",
      value: formatCLP(summary.revenueThisMonth),
      hint: momHint("Valor de propiedades cerradas (proyección)", summary.revenueMomChangePct),
      what: "Valor total en UF (convertido a CLP) de las propiedades ligadas a solicitudes que cerraron este mes. NO es comisión real -- el modelo de datos no guarda % de comisión.",
      how: "Suma price_uf de las propiedades seleccionadas/aceptadas en cada solicitud cerrada este mes, convertida a CLP con el valor UF vigente.",
      icon: WalletIcon,
      accent: "gold",
    },
    {
      label: "Cierres proyectados (30 días)",
      value: (summary.projectedNext30DaysCount ?? 0).toLocaleString("es-CL"),
      hint: `${formatCLP(Math.round((summary.projectedNext30DaysUf ?? 0) * UF_VALUE_CLP))} en UF estimadas`,
      what: "Cuántas solicitudes activas se estima que lleguen a Cierre en los próximos 30 días, según su avance actual en el pipeline.",
      how: "Para cada solicitud activa se suma la duración promedio histórica real de cada etapa que le falta hasta Cierre; si el resultado es ≤30 días, se cuenta acá.",
      icon: CalendarClockIcon,
      accent: "cyan",
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((card, index) => {
        const Icon = card.icon
        return (
          <div
            key={card.label}
            className="glass-surface animate-fade-in-up interactive-lift rounded-2xl p-5"
            style={{ "--animate-delay": `${index * 70}ms` } as React.CSSProperties}
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-text-secondary">
                {card.label}
                <InfoTooltip what={card.what} how={card.how} />
              </span>
              <span
                className={`flex size-[34px] shrink-0 items-center justify-center rounded-lg ${iconBgClass(card.accent)}`}
              >
                <Icon className={`size-4 ${accentClass(card.accent)}`} aria-hidden="true" />
              </span>
            </div>
            <p
              className="mt-3 font-heading text-[27px] font-semibold leading-none tracking-tight text-text-primary"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {card.value}
            </p>
            <p className="mt-2 text-[11.5px] text-text-tertiary">{card.hint}</p>
          </div>
        )
      })}
    </div>
  )
}
