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
            className="flex items-center justify-between rounded-lg bg-deep px-2.5 py-2"
          >
            <span className="flex items-center gap-2 text-xs font-semibold text-text-secondary">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
                aria-hidden="true"
              />
              {item.label}
            </span>
            <span
              className="font-heading text-[13px] font-semibold text-text-primary"
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
