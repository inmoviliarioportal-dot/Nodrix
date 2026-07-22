"use client"

import * as React from "react"
import { MapPin, Search } from "lucide-react"

interface ChileRegionWithComunas {
  id: string
  name: string
  comunas: string[]
}

/** Quita acentos y pasa a minúsculas para un filtro simple case/accent-insensitive. */
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
}

/**
 * Combobox con buscador para elegir comuna, agrupado por región. Reemplaza
 * el input de texto libre de comuna en PropertyPreferencesCard -- solo
 * ofrece comunas de regiones habilitadas (GET /api/regions/enabled), hoy
 * solo Región Metropolitana.
 */
function RegionComunaSelect({
  value,
  onChange,
}: {
  value: string | null
  onChange: (comuna: string) => void
}) {
  const [regions, setRegions] = React.useState<ChileRegionWithComunas[]>([])
  const [query, setQuery] = React.useState(value ?? "")
  const [isOpen, setIsOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    fetch("/api/regions/enabled")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setRegions(data?.regions ?? []))
      .catch(() => setRegions([]))
  }, [])

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const normalizedQuery = normalize(query)
  const groups = regions
    .map((region) => ({
      region,
      comunas: region.comunas.filter((comuna) => !normalizedQuery || normalize(comuna).includes(normalizedQuery)),
    }))
    .filter((group) => group.comunas.length > 0)

  function handleSelect(comuna: string) {
    setQuery(comuna)
    onChange(comuna)
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-text-tertiary" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Busca tu comuna"
          className="h-10 w-full rounded-lg border border-glass-border bg-deep pl-8 pr-3 text-sm text-text-primary outline-none"
        />
      </div>

      {isOpen && (
        <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-glass-border bg-deep shadow-lg">
          {groups.length === 0 ? (
            <p className="px-3 py-2 text-xs text-text-tertiary">Sin resultados.</p>
          ) : (
            groups.map((group) => (
              <div key={group.region.id}>
                <p className="px-3 pt-2 text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">
                  {group.region.name}
                </p>
                {group.comunas.map((comuna) => (
                  <button
                    key={comuna}
                    type="button"
                    onClick={() => handleSelect(comuna)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text-secondary transition-colors duration-200 hover:bg-surface-elevated hover:text-text-primary"
                  >
                    <MapPin className="size-3.5 text-neon-cyan" />
                    {comuna}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export { RegionComunaSelect }
