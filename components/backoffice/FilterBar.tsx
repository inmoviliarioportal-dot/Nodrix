"use client"

import { useRef, useEffect } from "react"
import { Search, X, ChevronDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  APPLICATION_STAGES,
  type ApplicationStage,
} from "@/lib/leads"
import {
  DAYS_BUCKET_LABELS,
  SCORING_CATEGORIES,
  STAGE_LABELS,
  type DaysInStageBucket,
  type QueueFilters,
  type ScoringCategory,
} from "./types"

interface FilterBarProps {
  filters: QueueFilters
  onChange: (filters: QueueFilters) => void
  onClear: () => void
  resultCount: number
}

function toggleValue<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

/** Dropdown de checklist accesible basado en <details>/<summary> (sin JS extra para abrir/cerrar). */
function CheckDropdown<T extends string>({
  label,
  options,
  labels,
  selected,
  onToggle,
}: {
  label: string
  options: readonly T[]
  labels: Record<T, string>
  selected: T[]
  onToggle: (value: T) => void
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (detailsRef.current && !detailsRef.current.contains(event.target as Node)) {
        detailsRef.current.open = false
      }
    }
    document.addEventListener("click", handleClickOutside)
    return () => document.removeEventListener("click", handleClickOutside)
  }, [])

  return (
    <details ref={detailsRef} className="group relative">
      <summary
        className={cn(
          "flex h-8 cursor-pointer list-none items-center gap-1.5 rounded-lg border border-glass-border bg-glass px-2.5 text-sm text-text-secondary transition-colors duration-200 select-none hover:text-text-primary [&::-webkit-details-marker]:hidden",
          selected.length > 0 && "border-neon-cyan/50 text-text-primary"
        )}
      >
        {label}
        {selected.length > 0 && (
          <span className="rounded-full bg-neon-cyan/15 px-1.5 text-xs text-neon-cyan">
            {selected.length}
          </span>
        )}
        <ChevronDown className="size-3.5 text-text-tertiary transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <div className="glass-card absolute left-0 top-[calc(100%+6px)] z-20 flex max-h-72 w-56 flex-col gap-1 overflow-y-auto rounded-lg p-2">
        {options.map((option) => (
          <label
            key={option}
            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-text-secondary transition-colors duration-150 hover:bg-white/5 hover:text-text-primary"
          >
            <input
              type="checkbox"
              className="size-3.5 accent-[var(--neon-cyan)]"
              checked={selected.includes(option)}
              onChange={() => onToggle(option)}
            />
            {labels[option]}
          </label>
        ))}
      </div>
    </details>
  )
}

/** Barra de filtros superior de la cola del asesor: stage, categoría, días en stage y búsqueda. */
function FilterBar({ filters, onChange, onClear, resultCount }: FilterBarProps) {
  const hasActiveFilters =
    filters.stages.length > 0 ||
    filters.categories.length > 0 ||
    filters.daysBucket !== null ||
    filters.search.trim().length > 0

  const daysBuckets: DaysInStageBucket[] = ["0-5", "5-10", "10+"]

  return (
    <div className="glass-surface flex flex-col gap-3 rounded-xl border border-glass-border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <CheckDropdown<ApplicationStage>
          label="Stage"
          options={APPLICATION_STAGES}
          labels={STAGE_LABELS}
          selected={filters.stages}
          onToggle={(value) =>
            onChange({ ...filters, stages: toggleValue(filters.stages, value) })
          }
        />
        <CheckDropdown<ScoringCategory>
          label="Categoría"
          options={SCORING_CATEGORIES}
          labels={{ BRONCE: "Bronce", PLATA: "Plata", ORO: "Oro", PLATINO: "Platino" }}
          selected={filters.categories}
          onToggle={(value) =>
            onChange({ ...filters, categories: toggleValue(filters.categories, value) })
          }
        />
        <div className="flex items-center gap-1 rounded-lg border border-glass-border bg-glass p-0.5">
          {daysBuckets.map((bucket) => (
            <button
              key={bucket}
              type="button"
              onClick={() =>
                onChange({
                  ...filters,
                  daysBucket: filters.daysBucket === bucket ? null : bucket,
                })
              }
              className={cn(
                "h-7 rounded-md px-2.5 text-xs font-medium text-text-secondary transition-colors duration-200 hover:text-text-primary",
                filters.daysBucket === bucket && "bg-neon-cyan/15 text-neon-cyan"
              )}
            >
              {DAYS_BUCKET_LABELS[bucket]}
            </button>
          ))}
        </div>

        <div className="relative ml-auto w-full max-w-xs sm:w-64">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text-tertiary" />
          <Input
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            placeholder="Buscar por nombre o email..."
            className="h-8 border-glass-border bg-glass pl-8 text-text-primary placeholder:text-text-tertiary"
          />
        </div>

        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="gap-1 text-text-tertiary hover:text-text-primary"
          >
            <X className="size-3.5" />
            Limpiar filtros
          </Button>
        )}
      </div>

      <p className="text-xs text-text-tertiary">
        {resultCount} {resultCount === 1 ? "lead encontrado" : "leads encontrados"}
      </p>
    </div>
  )
}

export { FilterBar }
