"use client"

import * as React from "react"
import { toast } from "sonner"

import { Toaster } from "@/components/ui/sonner"
import { STAGE_LABELS } from "@/components/dashboard/types"
import type { ApplicationRow, CustomerRow } from "@/lib/leads"

interface AdvisorUser {
  id: string
  email: string
  full_name: string | null
  role: string
}

const selectClassName =
  "bg-surface-elevated border-glass-border focus-visible:border-neon-cyan focus-visible:ring-neon-cyan/30 h-8 rounded-md border px-2 text-xs text-text-primary outline-none focus-visible:ring-2"

/**
 * Asignación/reasignación de asesor por solicitud -- admin/gerencia.
 * Lista todas las applications con su cliente + asesor asignado actual, y
 * permite cambiarlo vía PATCH /api/applications/[id]/assign.
 */
export default function AssignmentsPage() {
  const [applications, setApplications] = React.useState<ApplicationRow[]>([])
  const [customersById, setCustomersById] = React.useState<Record<string, CustomerRow | null>>({})
  const [advisors, setAdvisors] = React.useState<AdvisorUser[]>([])
  const [loading, setLoading] = React.useState(true)
  const [savingId, setSavingId] = React.useState<string | null>(null)

  const loadData = React.useCallback(async () => {
    setLoading(true)
    try {
      const [appsRes, advisorsRes] = await Promise.all([
        fetch("/api/applications?limit=200"),
        fetch("/api/admin/users?role=asesor"),
      ])

      const appsData = appsRes.ok ? await appsRes.json() : { applications: [] }
      const advisorsData = advisorsRes.ok ? await advisorsRes.json() : { users: [] }

      const apps: ApplicationRow[] = appsData.applications ?? []
      setApplications(apps)
      setAdvisors(advisorsData.users ?? [])

      const results = await Promise.all(
        apps.map((app) =>
          fetch(`/api/applications/${app.id}`)
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => ({ id: app.customer_id, customer: data?.customer ?? null }))
            .catch(() => ({ id: app.customer_id, customer: null }))
        )
      )
      const map: Record<string, CustomerRow | null> = {}
      for (const r of results) map[r.id] = r.customer
      setCustomersById(map)
    } catch {
      toast.error("No se pudieron cargar las solicitudes.")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  async function handleAssign(applicationId: string, advisorUserId: string) {
    setSavingId(applicationId)
    try {
      const response = await fetch(`/api/applications/${applicationId}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ advisorUserId: advisorUserId || null }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        toast.error(data?.error ?? "No se pudo asignar el asesor.")
        return
      }
      setApplications((prev) =>
        prev.map((app) => (app.id === applicationId ? { ...app, assigned_advisor_id: advisorUserId || null } : app))
      )
      toast.success("Asesor actualizado.")
    } catch {
      toast.error("Error de conexión.")
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Toaster />
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold text-text-primary">Asignar asesor</h1>
        <p className="text-sm text-text-secondary">
          Asigna o reasigna qué asesor está a cargo de cada solicitud.
        </p>
      </div>

      <div className="glass-card overflow-x-auto rounded-2xl p-4">
        {loading ? (
          <p className="p-4 text-sm text-text-tertiary">Cargando...</p>
        ) : applications.length === 0 ? (
          <p className="p-4 text-sm text-text-tertiary">No hay solicitudes.</p>
        ) : (
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-glass-border text-left text-xs text-text-tertiary uppercase">
                <th className="p-2">Cliente</th>
                <th className="p-2">Estado</th>
                <th className="p-2">Asesor asignado</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => {
                const customer = customersById[app.customer_id]
                const currentAdvisor = app.assigned_advisor_id ?? ""
                return (
                  <tr key={app.id} className="border-b border-glass-border/50">
                    <td className="p-2">
                      <div className="flex flex-col">
                        <span className="text-text-primary">{customer?.name ?? "—"}</span>
                        <span className="text-xs text-text-tertiary">{customer?.email ?? ""}</span>
                      </div>
                    </td>
                    <td className="p-2 text-text-secondary">{STAGE_LABELS[app.stage] ?? app.stage}</td>
                    <td className="p-2">
                      <select
                        className={selectClassName}
                        value={currentAdvisor}
                        disabled={savingId === app.id}
                        onChange={(e) => handleAssign(app.id, e.target.value)}
                      >
                        <option value="">Sin asignar</option>
                        {advisors.map((advisor) => (
                          <option key={advisor.id} value={advisor.id}>
                            {advisor.full_name ?? advisor.email}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
