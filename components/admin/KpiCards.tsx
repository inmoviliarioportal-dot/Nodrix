import { TrendingUpIcon, PercentIcon, ClockIcon, WalletIcon } from "lucide-react"

import { formatCLP, MOCK_KPI_SUMMARY } from "@/components/admin/types"

interface KpiCardDef {
  label: string
  value: string
  hint: string
  icon: React.ComponentType<{ className?: string }>
  glow: "cyan" | "purple" | "green" | "gold"
}

function glowClass(glow: KpiCardDef["glow"]) {
  switch (glow) {
    case "cyan":
      return "glow-cyan"
    case "purple":
      return "glow-purple"
    case "green":
      return "glow-green"
    default:
      return "shadow-[0_0_24px_0_rgba(212,175,55,0.35)]"
  }
}

function textGlowClass(glow: KpiCardDef["glow"]) {
  switch (glow) {
    case "cyan":
      return "text-glow-cyan"
    case "purple":
      return "text-glow-purple"
    case "green":
      return "text-glow-green"
    default:
      return "[text-shadow:0_0_16px_rgba(212,175,55,0.35)]"
  }
}

function iconColorClass(glow: KpiCardDef["glow"]) {
  switch (glow) {
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

/** Top 4 KPI cards del Admin Dashboard — acento gold/neón, data mock. */
export function KpiCards() {
  const cards: KpiCardDef[] = [
    {
      label: "Leads este mes",
      value: MOCK_KPI_SUMMARY.totalLeadsThisMonth.toLocaleString("es-CL"),
      hint: "Total capturados en el periodo",
      icon: TrendingUpIcon,
      glow: "cyan",
    },
    {
      label: "Tasa de conversión",
      value: `${MOCK_KPI_SUMMARY.conversionRate.toFixed(1)}%`,
      hint: "Recepcionada → Cierre",
      icon: PercentIcon,
      glow: "purple",
    },
    {
      label: "Días promedio a cierre",
      value: `${MOCK_KPI_SUMMARY.avgDaysToClose}`,
      hint: "Desde recepción hasta cierre",
      icon: ClockIcon,
      glow: "green",
    },
    {
      label: "Ingresos este mes",
      value: formatCLP(MOCK_KPI_SUMMARY.revenueThisMonth),
      hint: "Comisiones estimadas (mock)",
      icon: WalletIcon,
      glow: "gold",
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <div
            key={card.label}
            className={`glass-card rounded-2xl p-5 transition-transform duration-200 hover:-translate-y-0.5 ${glowClass(card.glow)}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-text-secondary">{card.label}</span>
              <Icon className={`size-5 ${iconColorClass(card.glow)}`} />
            </div>
            <p
              className={`mt-3 font-variant-numeric-tabular text-3xl font-semibold tracking-tight text-text-primary lg:text-4xl ${textGlowClass(card.glow)}`}
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {card.value}
            </p>
            <p className="mt-1 text-xs text-text-tertiary">{card.hint}</p>
          </div>
        )
      })}
    </div>
  )
}
