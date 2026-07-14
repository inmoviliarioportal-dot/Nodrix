"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"

import { FilterBar } from "@/components/backoffice/FilterBar"
import { LeadCard } from "@/components/backoffice/LeadCard"
import { Button } from "@/components/ui/button"
import type { ApplicationRow, CustomerRow } from "@/lib/leads"
import {
  EMPTY_FILTERS,
  QUEUE_FILTERS_STORAGE_KEY,
  daysInStage,
  matchesDaysBucket,
  type QueueFilters,
  type QueueLead,
} from "@/components/backoffice/types"

const PAGE_SIZE = 12

function loadStoredFilters(): QueueFilters {
  if (typeof window === "undefined") return EMPTY_FILTERS
  try {
    const raw = window.localStorage.getItem(QUEUE_FILTERS_STORAGE_KEY)
    if (!raw) return EMPTY_FILTERS
    const parsed = JSON.parse(raw)
    return {
      stages: Array.isArray(parsed.stages) ? parsed.stages : [],
      categories: Array.isArray(parsed.categories) ? parsed.categories : [],
      daysBucket: parsed.daysBucket ?? null,
      search: typeof parsed.search === "string" ? parsed.search : "",
    }
  } catch {
    return EMPTY_FILTERS
  }
}

/** Bandeja del asesor: cola de leads con filtros persistentes, búsqueda y paginación. */
export default function BackofficeQueuePage() {
  const searchParams = useSearchParams()
  const [filters, setFilters] = useState<QueueFilters>(EMPTY_FILTERS)
  const [hydrated, setHydrated] = useState(false)
  const [applications, setApplications] = useState<ApplicationRow[]>([])
  const [customersById, setCustomersById] = useState<Record<string, CustomerRow | null>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  // Hidrata filtros: si llegan por query string (drilldown desde el panel
  // admin, ej. /backoffice/queue?stage=X o ?category=Y), esos tienen
  // prioridad sobre lo guardado en localStorage.
  useEffect(() => {
    const stageParam = searchParams.get("stage")
    const categoryParam = searchParams.get("category")

    if (stageParam || categoryParam) {
      setFilters({
        ...EMPTY_FILTERS,
        stages: stageParam ? [stageParam as never] : [],
        categories: categoryParam ? [categoryParam as never] : [],
      })
    } else {
      setFilters(loadStoredFilters())
    }
    setHydrated(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persiste filtros en localStorage en cada cambio (post-hidratación).
  useEffect(() => {
    if (!hydrated) return
    window.localStorage.setItem(QUEUE_FILTERS_STORAGE_KEY, JSON.stringify(filters))
  }, [filters, hydrated])

  // Carga inicial de applications (filtrado fino se hace en cliente: la API
  // solo soporta un único `stage` exacto, y necesitamos combinar múltiples
  // stages + categoría + días + búsqueda).
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetch("/api/applications?limit=200")
      .then(async (res) => {
        if (!res.ok) throw new Error(`Error ${res.status} al cargar applications`)
        return res.json()
      })
      .then((data) => {
        if (cancelled) return
        setApplications(data.applications ?? [])
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "Error desconocido")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    const search = filters.search.trim().toLowerCase()
    return applications.filter((app) => {
      if (filters.stages.length > 0 && !filters.stages.includes(app.stage as never)) return false
      if (
        filters.categories.length > 0 &&
        !filters.categories.includes(app.scoring_category as never)
      )
        return false
      if (filters.daysBucket && !matchesDaysBucket(daysInStage(app.updated_at), filters.daysBucket))
        return false

      if (search) {
        const customer = customersById[app.customer_id]
        const haystack = `${customer?.name ?? ""} ${customer?.email ?? ""}`.toLowerCase()
        if (!haystack.includes(search)) return false
      }
      return true
    })
  }, [applications, filters, customersById])

  // Reset de página cuando cambian los filtros.
  useEffect(() => {
    setPage(1)
  }, [filters.stages, filters.categories, filters.daysBucket, filters.search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Resuelve datos de cliente solo para las applications visibles en la
  // página actual (evita N+1 sobre toda la lista).
  useEffect(() => {
    const missing = pageItems.filter((app) => !(app.customer_id in customersById))
    if (missing.length === 0) return

    let cancelled = false
    Promise.all(
      missing.map((app) =>
        fetch(`/api/applications/${app.id}`)
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => ({ id: app.customer_id, customer: data?.customer ?? null }))
          .catch(() => ({ id: app.customer_id, customer: null }))
      )
    ).then((results) => {
      if (cancelled) return
      setCustomersById((prev) => {
        const next = { ...prev }
        for (const r of results) next[r.id] = r.customer
        return next
      })
    })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageItems.map((a) => a.id).join(",")])

  const leads: QueueLead[] = pageItems.map((application) => ({
    application,
    customer: customersById[application.customer_id] ?? null,
  }))

  const handleClear = useCallback(() => setFilters(EMPTY_FILTERS), [])

  return (
    <div className="bg-deep-ambient min-h-screen px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold text-text-primary">
            Bandeja de leads
          </h1>
          <p className="text-sm text-text-secondary">
            Cola de solicitudes en curso, priorizadas por stage y tiempo de espera.
          </p>
        </header>

        <FilterBar
          filters={filters}
          onChange={setFilters}
          onClear={handleClear}
          resultCount={filtered.length}
        />

        {error && (
          <div className="glass-card rounded-xl border border-error/30 p-4 text-sm text-error">
            {error}
          </div>
        )}

        {loading ? (
          <div className="glass-card rounded-xl p-8 text-center text-sm text-text-tertiary">
            Cargando leads...
          </div>
        ) : leads.length === 0 ? (
          <div className="glass-card rounded-xl p-8 text-center text-sm text-text-tertiary">
            No hay leads que coincidan con los filtros actuales.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {leads.map((lead) => (
              <LeadCard key={lead.application.id} lead={lead} />
            ))}
          </div>
        )}

        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </Button>
            <span className="text-xs text-text-tertiary">
              Página {page} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Siguiente
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
