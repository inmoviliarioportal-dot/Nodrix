import { TrendingUpIcon, PercentIcon, ClockIcon, WalletIcon } from "lucide-react"

import { formatCLP, MOCK_KPI_SUMMARY } from "@/components/admin/types"

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

/**
 * Top 4 KPI cards del Admin Dashboard — cards compactas y neutras
 * (`glass-surface`), con UN solo acento de color por card aplicado solo al
 * icono y al número (sin glow, sin colorear la card completa).
 */
export function KpiCards() {
  const cards: KpiCardDef[] = [
    {
      label: "Leads este mes",
      value: MOCK_KPI_SUMMARY.totalLeadsThisMonth.toLocaleString("es-CL"),
      hint: "Total capturados en el periodo",
      icon: TrendingUpIcon,
      accent: "cyan",
    },
    {
      label: "Tasa de conversión",
      value: `${MOCK_KPI_SUMMARY.conversionRate.toFixed(1)}%`,
      hint: "Recepcionada → Cierre",
      icon: PercentIcon,
      accent: "purple",
    },
    {
      label: "Días promedio a cierre",
      value: `${MOCK_KPI_SUMMARY.avgDaysToClose}`,
      hint: "Desde recepción hasta cierre",
      icon: ClockIcon,
      accent: "green",
    },
    {
      label: "Ingresos este mes",
      value: formatCLP(MOCK_KPI_SUMMARY.revenueThisMonth),
      hint: "Comisiones estimadas (mock)",
      icon: WalletIcon,
      accent: "gold",
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <div key={card.label} className="glass-surface rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <span className="text-[12.5px] font-semibold text-text-secondary">{card.label}</span>
              <Icon className={`size-[17px] shrink-0 ${accentClass(card.accent)}`} aria-hidden="true" />
            </div>
            <p
              className="mt-3 text-[26px] font-bold leading-none tracking-tight text-text-primary"
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
