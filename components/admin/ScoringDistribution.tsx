import { MOCK_SCORING_DISTRIBUTION } from "@/components/admin/types"

/**
 * Distribución de scoring — filas compactas por categoría (label coloreado
 * por su tono de scoring + % en la esquina), sin doughnut chart. Data mock
 * hasta que exista agregación real por scoring_category.
 */
export function ScoringDistribution() {
  return (
    <div className="glass-surface rounded-2xl p-5">
      <h2 className="text-xs font-bold uppercase tracking-wide text-text-tertiary">
        Por categoría de scoring
      </h2>

      <div className="mt-3.5 flex flex-col gap-2">
        {MOCK_SCORING_DISTRIBUTION.map((item) => (
          <div
            key={item.category}
            className="flex items-center justify-between rounded-lg bg-white/[0.03] px-2.5 py-2"
          >
            <span className="text-xs font-semibold" style={{ color: item.color }}>
              {item.label}
            </span>
            <span
              className="text-[12.5px] font-bold text-text-primary"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {item.percentage}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
