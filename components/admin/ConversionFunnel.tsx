import { MOCK_FUNNEL } from "@/components/admin/types"

/**
 * Funnel de conversión — barras escalonadas (stepped bars) por los 9 estados
 * del pipeline. Sin librería externa: ancho proporcional al conteo, con
 * gradiente cian → púrpura → verde a medida que avanza el pipeline.
 */
export function ConversionFunnel() {
  const maxCount = MOCK_FUNNEL[0]?.count ?? 1
  const colors = ["#22D3EE", "#38C9E8", "#5EC0EA", "#84AFEA", "#A78BFA", "#8FA8E8", "#6FBFB0", "#4FC79A", "#34D399"]

  return (
    <div className="glass-card rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-text-primary">Funnel de conversión</h3>
      <p className="text-xs text-text-tertiary">9 estados del pipeline — leads y % de drop-off</p>

      <div className="mt-5 flex flex-col gap-2.5">
        {MOCK_FUNNEL.map((stage, i) => {
          const widthPct = Math.max(8, (stage.count / maxCount) * 100)
          const prev = MOCK_FUNNEL[i - 1]
          const dropOff = prev ? (((prev.count - stage.count) / prev.count) * 100).toFixed(1) : null

          return (
            <div key={stage.stage} className="flex items-center gap-3">
              <span className="w-40 shrink-0 truncate text-xs text-text-secondary" title={stage.label}>
                {stage.label}
              </span>
              <div className="relative h-7 flex-1 rounded-md bg-surface-elevated">
                <div
                  className="flex h-7 items-center rounded-md px-2 transition-all duration-300"
                  style={{
                    width: `${widthPct}%`,
                    backgroundColor: colors[i % colors.length],
                    opacity: 0.85,
                  }}
                >
                  <span
                    className="text-xs font-semibold text-dark-primary"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {stage.count}
                  </span>
                </div>
              </div>
              <span className="w-16 shrink-0 text-right text-xs text-text-tertiary" style={{ fontVariantNumeric: "tabular-nums" }}>
                {dropOff ? `-${dropOff}%` : "—"}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
