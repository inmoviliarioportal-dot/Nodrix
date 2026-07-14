"use client"

import * as React from "react"
import { CalendarClockIcon, CheckIcon, XIcon } from "lucide-react"
import { toast } from "sonner"

import { Toaster } from "@/components/ui/sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface VisitRow {
  id: string
  application_id: string
  property_id: string
  scheduled_at: string
  completed_at: string | null
  status: "agendada" | "realizada" | "cancelada" | "no_show"
  application: {
    id: string
    stage: string
    customer: { id: string; name: string; email: string; phone: string | null } | null
  } | null
  property: { id: string; name: string; location: string | null } | null
}

const STATUS_LABELS: Record<VisitRow["status"], string> = {
  agendada: "Agendada",
  realizada: "Realizada",
  cancelada: "Cancelada",
  no_show: "No asistió",
}

const STATUS_COLORS: Record<VisitRow["status"], string> = {
  agendada: "border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan",
  realizada: "border-status-success/40 bg-status-success/10 text-status-success",
  cancelada: "border-text-tertiary/40 bg-text-tertiary/10 text-text-tertiary",
  no_show: "border-status-error/40 bg-status-error/10 text-status-error",
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/**
 * Seguimiento de visitas a propiedades: para el asesor, marcar
 * realizada/no-show de las visitas de sus clientes; para admin/gerencia,
 * además reagendar la fecha cuando el cliente no puede asistir.
 */
export function VisitsClient() {
  const [visits, setVisits] = React.useState<VisitRow[]>([])
  const [role, setRole] = React.useState<string | null>(null)
  const [visitasPermission, setVisitasPermission] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [reschedulingId, setReschedulingId] = React.useState<string | null>(null)
  const [newDate, setNewDate] = React.useState("")

  // Admin/gerencia siempre pueden reagendar; un rol personalizado también
  // puede si se le asignó permiso de "Editar" sobre Visitas (así se arma un
  // rol de "solo reagendamiento" sin darle el rol builtin de asesor).
  const canReschedule = role === "admin" || role === "gerencia" || (role === "custom" && visitasPermission === "edit")

  const load = React.useCallback(() => {
    setLoading(true)
    fetch("/api/visits")
      .then(async (res) => {
        if (!res.ok) throw new Error("Error al cargar visitas")
        return res.json()
      })
      .then((data) => setVisits(data.visits ?? []))
      .catch((err) => setError(err instanceof Error ? err.message : "Error desconocido"))
      .finally(() => setLoading(false))
  }, [])

  React.useEffect(() => {
    load()
    fetch("/api/auth/user")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setRole(data?.role ?? null)
        setVisitasPermission(data?.permissions?.visitas ?? null)
      })
      .catch(() => {})
  }, [load])

  async function updateStatus(id: string, status: VisitRow["status"]) {
    const res = await fetch(`/api/visits/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    if (!res.ok) {
      toast.error("No se pudo actualizar la visita.")
      return
    }
    toast.success(`Visita marcada como "${STATUS_LABELS[status]}".`)
    load()
  }

  async function reschedule(id: string) {
    if (!newDate) return
    const res = await fetch(`/api/visits/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduledAt: new Date(newDate).toISOString() }),
    })
    if (!res.ok) {
      toast.error("No se pudo reagendar la visita.")
      return
    }
    toast.success("Visita reagendada correctamente.")
    setReschedulingId(null)
    setNewDate("")
    load()
  }

  const now = Date.now()

  return (
    <div className="flex flex-col gap-6">
      <Toaster />
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold text-text-primary">Visitas programadas</h1>
        <p className="text-sm text-text-secondary">
          Seguimiento de visitas a propiedades — marca si el cliente asistió
          {canReschedule ? " o reagenda cuando no pueda." : "."}
        </p>
      </div>

      {error && (
        <div className="glass-card rounded-xl border border-error/30 p-4 text-sm text-error">{error}</div>
      )}

      {loading ? (
        <div className="glass-card rounded-xl p-8 text-center text-sm text-text-tertiary">Cargando visitas...</div>
      ) : visits.length === 0 ? (
        <div className="glass-card rounded-xl p-8 text-center text-sm text-text-tertiary">
          No hay visitas agendadas todavía.
        </div>
      ) : (
        <div className="glass-card overflow-x-auto rounded-2xl p-4">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-glass-border text-left text-xs font-medium uppercase tracking-wide text-text-tertiary">
                <th className="py-2 pr-2">Cliente</th>
                <th className="py-2 pr-2">Propiedad</th>
                <th className="py-2 pr-2">Fecha agendada</th>
                <th className="py-2 pr-2">Estado</th>
                <th className="py-2 pr-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visits.map((visit) => {
                const isOverdue = visit.status === "agendada" && new Date(visit.scheduled_at).getTime() < now
                return (
                  <tr key={visit.id} className="border-b border-glass-border/50">
                    <td className="py-2 pr-2 text-text-secondary">
                      {visit.application?.customer?.name ?? "Cliente sin nombre"}
                    </td>
                    <td className="py-2 pr-2 text-text-secondary">
                      {visit.property?.name ?? "—"}
                      {visit.property?.location && (
                        <span className="block text-xs text-text-tertiary">{visit.property.location}</span>
                      )}
                    </td>
                    <td className={cn("py-2 pr-2", isOverdue ? "font-medium text-status-warning" : "text-text-secondary")}>
                      {formatDate(visit.scheduled_at)}
                      {isOverdue && <span className="ml-1.5 text-xs">(vencida)</span>}
                    </td>
                    <td className="py-2 pr-2">
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-xs font-medium",
                          STATUS_COLORS[visit.status]
                        )}
                      >
                        {STATUS_LABELS[visit.status]}
                      </span>
                    </td>
                    <td className="py-2 pr-2">
                      <div className="flex items-center justify-end gap-1.5">
                        {visit.status === "agendada" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 gap-1 px-2 text-xs"
                              onClick={() => updateStatus(visit.id, "realizada")}
                            >
                              <CheckIcon className="size-3.5" />
                              Realizada
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 gap-1 px-2 text-xs text-status-error"
                              onClick={() => updateStatus(visit.id, "no_show")}
                            >
                              <XIcon className="size-3.5" />
                              No asistió
                            </Button>
                            {canReschedule &&
                              (reschedulingId === visit.id ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="datetime-local"
                                    value={newDate}
                                    onChange={(e) => setNewDate(e.target.value)}
                                    className="h-7 rounded-md border border-glass-border bg-surface-elevated px-2 text-xs text-text-primary outline-none"
                                  />
                                  <Button size="sm" className="h-7 px-2 text-xs" onClick={() => reschedule(visit.id)}>
                                    Guardar
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 gap-1 px-2 text-xs"
                                  onClick={() => setReschedulingId(visit.id)}
                                >
                                  <CalendarClockIcon className="size-3.5" />
                                  Reagendar
                                </Button>
                              ))}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
