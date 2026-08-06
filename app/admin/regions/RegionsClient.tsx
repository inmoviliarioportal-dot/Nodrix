"use client"

import * as React from "react"
import { toast } from "sonner"

import { Toaster } from "@/components/ui/sonner"
import { cn } from "@/lib/utils"

interface RegionRow {
  id: string
  name: string
  enabled: boolean
}

/**
 * Panel admin/gerencia para activar/desactivar regiones. Al activar una
 * región se habilitan automáticamente TODAS sus comunas (ver
 * lib/chile-regions.ts) para que los clientes puedan seleccionarlas en
 * RegionComunaSelect -- no hay un toggle por comuna individual.
 */
export default function AdminRegionsPage() {
  const [regions, setRegions] = React.useState<RegionRow[]>([])
  const [loading, setLoading] = React.useState(true)
  const [updatingId, setUpdatingId] = React.useState<string | null>(null)

  const load = React.useCallback(() => {
    setLoading(true)
    fetch("/api/admin/regions")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setRegions(data?.regions ?? []))
      .finally(() => setLoading(false))
  }, [])

  React.useEffect(() => {
    load()
  }, [load])

  async function toggle(region: RegionRow) {
    setUpdatingId(region.id)
    try {
      const res = await fetch("/api/admin/regions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: region.id, enabled: !region.enabled }),
      })
      if (!res.ok) {
        toast.error("No se pudo actualizar la región.")
        return
      }
      setRegions((prev) => prev.map((r) => (r.id === region.id ? { ...r, enabled: !region.enabled } : r)))
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Toaster />
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold text-text-primary">Regiones</h1>
        <p className="text-sm text-text-secondary">
          Al activar una región se habilitan automáticamente todas sus comunas para que los clientes puedan
          seleccionarlas en el selector de comuna del onboarding.
        </p>
      </div>

      <div className="glass-card rounded-2xl p-4">
        {loading ? (
          <p className="p-4 text-sm text-text-tertiary">Cargando...</p>
        ) : (
          <ul className="divide-y divide-glass-border/50">
            {regions.map((region) => (
              <li key={region.id} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="text-sm font-medium text-text-primary">{region.name}</p>
                  <p className="text-xs text-text-tertiary">Código: {region.id}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={region.enabled}
                  disabled={updatingId === region.id}
                  onClick={() => toggle(region)}
                  className={cn(
                    "relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-200 disabled:opacity-50",
                    region.enabled ? "border-neon-cyan bg-neon-cyan/30" : "border-glass-border bg-surface-elevated"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 size-4 rounded-full bg-text-primary transition-transform duration-200",
                      region.enabled ? "translate-x-6" : "translate-x-0.5"
                    )}
                  />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
