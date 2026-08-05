import { TrendingUpIcon, PercentIcon, ClockIcon, WalletIcon } from "lucide-react"

import { formatCLP } from "@/components/admin/types"

export interface KpiSummaryData {
  totalLeadsThisMonth: number
  leadsMomChangePct: number | null
  conversionRate: number
  avgDaysToClose: number
  revenueThisMonth: number
  revenueMomChangePct: number | null
}

interface KpiCardDef {
  label: string
  value: string
  hint: string
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
      icon: TrendingUpIcon,
      accent: "cyan",
    },
    {
      label: "Tasa de conversión",
      value: `${summary.conversionRate.toFixed(1)}%`,
      hint: "Recepcionada → Cierre, histórico",
      icon: PercentIcon,
      accent: "purple",
    },
    {
      label: "Días promedio a cierre",
      value: `${summary.avgDaysToClose}`,
      hint: "Desde recepción hasta cierre",
      icon: ClockIcon,
      accent: "green",
    },
    {
      label: "UF gestionadas este mes",
      value: formatCLP(summary.revenueThisMonth),
      hint: momHint("Valor de propiedades cerradas (proyección)", summary.revenueMomChangePct),
      icon: WalletIcon,
      accent: "gold",
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => {
        const Icon = card.icon
        return (
          <div
            key={card.label}
            className="glass-surface animate-fade-in-up interactive-lift rounded-2xl p-5"
            style={{ "--animate-delay": `${index * 70}ms` } as React.CSSProperties}
          >
            <div className="flex items-center justify-between">
              <span className="text-[12.5px] font-semibold text-text-secondary">{card.label}</span>
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
