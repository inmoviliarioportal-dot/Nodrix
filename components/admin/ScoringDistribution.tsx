import { MOCK_SCORING_DISTRIBUTION } from "@/components/admin/types"

/**
 * Distribución de scoring — doughnut chart vía conic-gradient CSS (sin
 * librería externa). Data mock hasta que exista agregación real por
 * scoring_category.
 */
export function ScoringDistribution() {
  let cumulative = 0
  const stops = MOCK_SCORING_DISTRIBUTION.map((item) => {
    const start = cumulative
    cumulative += item.percentage
    return `${item.color} ${start}% ${cumulative}%`
  }).join(", ")

  return (
    <div className="glass-card rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-text-primary">Distribución de scoring</h3>
      <p className="text-xs text-text-tertiary">% de clientes por categoría (mock)</p>

      <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:justify-around">
        <div
          className="relative size-36 shrink-0 rounded-full"
          style={{ background: `conic-gradient(${stops})` }}
          role="img"
          aria-label="Distribución de scoring por categoría"
        >
          <div className="absolute inset-3 flex items-center justify-center rounded-full bg-dark-secondary">
            <span className="text-xs text-text-tertiary">Scoring</span>
          </div>
        </div>

        <ul className="flex w-full flex-col gap-2 sm:w-auto">
          {MOCK_SCORING_DISTRIBUTION.map((item) => (
            <li key={item.category} className="flex items-center gap-2 text-sm">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
                aria-hidden="true"
              />
              <span className="text-text-secondary">{item.label}</span>
              <span className="ml-auto font-medium text-text-primary" style={{ fontVariantNumeric: "tabular-nums" }}>
                {item.percentage}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
