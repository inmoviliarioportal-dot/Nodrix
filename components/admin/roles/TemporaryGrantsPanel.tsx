"use client"

import * as React from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
// SOLO el tipo de lib/permissions -- ver la nota en PermissionMatrix.tsx
// sobre por qué los VALORES (PERMISSION_MODULES/labels) se importan de acá
// en vez de lib/permissions.ts (que arrastra código de servidor).
import type { PermissionModule } from "@/lib/permissions"
import { PERMISSION_MODULE_LABELS, PERMISSION_MODULES } from "@/components/admin/roles/PermissionMatrix"
import { cn } from "@/lib/utils"

function selectClassName() {
  return "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
}

interface StaffUserRow {
  id: string
  email: string
  full_name: string | null
  role: string
}

type GrantStatus = "active" | "scheduled" | "expired" | "revoked"

interface Grant {
  id: string
  userId: string
  userEmail: string | null
  userName: string | null
  permissionKey: string
  level: "view" | "edit" | string
  reason: string
  startsAt: string
  expiresAt: string
  revokedAt: string | null
  createdAt: string
  status: GrantStatus
  grantedBy: { id: string; email: string | null; fullName: string | null }
}

const STATUS_LABELS: Record<GrantStatus, { label: string; className: string }> = {
  active: { label: "Vigente", className: "border-status-success/40 bg-status-success/10 text-status-success" },
  scheduled: { label: "Programado", className: "border-accent-blue/40 bg-accent-blue/10 text-accent-blue" },
  expired: { label: "Vencido", className: "border-glass-border bg-transparent text-text-tertiary" },
  revoked: { label: "Revocado", className: "border-status-error/40 bg-status-error/10 text-status-error" },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short" })
}

/**
 * Sección de permisos temporales por usuario (migración 037 / endpoint
 * `/api/admin/permission-grants`). SOLO ELEVAN el acceso del perfil del
 * usuario destino -- nunca lo restringen (regla de negocio central, ver
 * nota visible más abajo en la UI).
 */
export function TemporaryGrantsPanel() {
  const [users, setUsers] = React.useState<StaffUserRow[]>([])
  const [loadingUsers, setLoadingUsers] = React.useState(true)
  const [userSearch, setUserSearch] = React.useState("")

  const [grants, setGrants] = React.useState<Grant[]>([])
  const [loadingGrants, setLoadingGrants] = React.useState(true)
  const [includeInactive, setIncludeInactive] = React.useState(false)

  const [userId, setUserId] = React.useState("")
  const [permissionKey, setPermissionKey] = React.useState<PermissionModule>(PERMISSION_MODULES[0])
  const [level, setLevel] = React.useState<"view" | "edit">("view")
  const [expiresAt, setExpiresAt] = React.useState("")
  const [reason, setReason] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [revokingId, setRevokingId] = React.useState<string | null>(null)

  const loadUsers = React.useCallback(() => {
    setLoadingUsers(true)
    fetch("/api/admin/users")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        // admin queda fuera acá también en el front, además del rechazo del
        // backend (TARGET_IS_ADMIN): no tiene sentido ofrecerlo en el selector.
        const staff = ((data?.users ?? []) as StaffUserRow[]).filter((u) => u.role !== "admin")
        setUsers(staff)
      })
      .finally(() => setLoadingUsers(false))
  }, [])

  const loadGrants = React.useCallback((withInactive: boolean) => {
    setLoadingGrants(true)
    const qs = withInactive ? "?includeInactive=1" : ""
    fetch(`/api/admin/permission-grants${qs}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setGrants(data?.grants ?? []))
      .finally(() => setLoadingGrants(false))
  }, [])

  React.useEffect(() => {
    loadUsers()
  }, [loadUsers])

  React.useEffect(() => {
    loadGrants(includeInactive)
  }, [loadGrants, includeInactive])

  const filteredUsers = React.useMemo(() => {
    const term = userSearch.trim().toLowerCase()
    if (!term) return users
    return users.filter(
      (u) => (u.full_name ?? "").toLowerCase().includes(term) || u.email.toLowerCase().includes(term)
    )
  }, [users, userSearch])

  function resetForm() {
    setUserId("")
    setPermissionKey(PERMISSION_MODULES[0])
    setLevel("view")
    setExpiresAt("")
    setReason("")
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!userId) {
      toast.error("Selecciona un usuario.")
      return
    }
    if (!reason.trim()) {
      toast.error("El motivo es obligatorio.")
      return
    }
    if (!expiresAt) {
      toast.error("Indica una fecha de vencimiento.")
      return
    }
    const expiresAtIso = new Date(expiresAt).toISOString()
    if (new Date(expiresAtIso).getTime() <= Date.now()) {
      toast.error("La fecha de vencimiento debe ser futura.")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/admin/permission-grants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, permissionKey, level, expiresAt: expiresAtIso, reason: reason.trim() }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        toast.error(data?.error ?? "No se pudo otorgar el permiso temporal.")
        return
      }
      toast.success("Permiso temporal otorgado.")
      resetForm()
      loadGrants(includeInactive)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRevoke(grant: Grant) {
    setRevokingId(grant.id)
    try {
      const res = await fetch(`/api/admin/permission-grants?id=${grant.id}`, { method: "DELETE" })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        toast.error(data?.error ?? "No se pudo revocar el permiso.")
        return
      }
      toast.success("Permiso revocado.")
      loadGrants(includeInactive)
    } finally {
      setRevokingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="glass-card rounded-2xl p-6">
        <div className="mb-4 flex flex-col gap-1">
          <h2 className="font-heading text-sm font-semibold tracking-wide text-text-tertiary uppercase">
            Otorgar permiso temporal
          </h2>
          <p className="text-xs text-text-tertiary">
            Regla central: un permiso temporal SOLO PUEDE ELEVAR el acceso que ya tiene el perfil del usuario (ej. de
            "sin acceso" a "ver", o de "ver" a "editar"). Nunca se usa para restringir -- para eso está la matriz del
            perfil.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="grant-user-search">Usuario</FieldLabel>
            <Input
              id="grant-user-search"
              className="bg-surface-elevated border-glass-border max-w-sm"
              placeholder="Buscar por nombre o correo..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
            <select
              className={cn(selectClassName(), "max-w-sm")}
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              disabled={loadingUsers}
            >
              <option value="">{loadingUsers ? "Cargando usuarios..." : "Selecciona un usuario"}</option>
              {filteredUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {(u.full_name || u.email) + ` (${u.role})`}
                </option>
              ))}
            </select>
          </Field>

          <div className="flex flex-wrap gap-4">
            <Field className="w-56">
              <FieldLabel htmlFor="grant-permission">Permiso</FieldLabel>
              <select
                id="grant-permission"
                className={selectClassName()}
                value={permissionKey}
                onChange={(e) => setPermissionKey(e.target.value as PermissionModule)}
              >
                {PERMISSION_MODULES.map((module) => (
                  <option key={module} value={module}>
                    {PERMISSION_MODULE_LABELS[module]}
                  </option>
                ))}
              </select>
            </Field>

            <Field className="w-40">
              <FieldLabel htmlFor="grant-level">Nivel</FieldLabel>
              <select
                id="grant-level"
                className={selectClassName()}
                value={level}
                onChange={(e) => setLevel(e.target.value as "view" | "edit")}
              >
                <option value="view">Ver</option>
                <option value="edit">Editar</option>
              </select>
            </Field>

            <Field className="w-56">
              <FieldLabel htmlFor="grant-expires">Vence</FieldLabel>
              <Input
                id="grant-expires"
                type="datetime-local"
                className="bg-surface-elevated border-glass-border"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="grant-reason">Motivo</FieldLabel>
            <Input
              id="grant-reason"
              className="bg-surface-elevated border-glass-border max-w-md"
              placeholder="Ej: cubre a un colega con vacaciones esta semana"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>

          <Button
            type="submit"
            disabled={submitting}
            className="glow-cyan bg-neon-cyan text-deep hover:bg-neon-cyan/90 w-fit"
          >
            {submitting ? "Otorgando..." : "Otorgar permiso"}
          </Button>
        </form>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-sm font-semibold tracking-wide text-text-tertiary uppercase">
            Permisos temporales de la organización
          </h2>
          <label className="flex items-center gap-2 text-xs text-text-tertiary">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
              className="accent-neon-cyan size-3.5"
            />
            Mostrar vencidos y revocados
          </label>
        </div>

        {loadingGrants ? (
          <p className="text-sm text-text-tertiary">Cargando...</p>
        ) : grants.length === 0 ? (
          <p className="text-sm text-text-tertiary">No hay permisos temporales para mostrar.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-sm">
              <thead>
                <tr className="border-glass-border text-text-tertiary border-b text-left text-xs tracking-wide uppercase">
                  <th className="py-2 pr-2">Usuario</th>
                  <th className="py-2 pr-2">Permiso</th>
                  <th className="py-2 pr-2">Nivel</th>
                  <th className="py-2 pr-2">Vence</th>
                  <th className="py-2 pr-2">Otorgado por</th>
                  <th className="py-2 pr-2">Estado</th>
                  <th className="py-2 pr-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {grants.map((grant) => (
                  <tr key={grant.id} className="border-glass-border/50 border-b">
                    <td className="py-2 pr-2 text-text-secondary">
                      {grant.userName || grant.userEmail || grant.userId}
                    </td>
                    <td className="py-2 pr-2 text-text-secondary">
                      {PERMISSION_MODULE_LABELS[grant.permissionKey as PermissionModule] ?? grant.permissionKey}
                    </td>
                    <td className="py-2 pr-2 text-text-secondary">{grant.level === "edit" ? "Editar" : "Ver"}</td>
                    <td className="py-2 pr-2 text-text-secondary">{formatDate(grant.expiresAt)}</td>
                    <td className="py-2 pr-2 text-text-secondary">
                      {grant.grantedBy.fullName || grant.grantedBy.email || "—"}
                    </td>
                    <td className="py-2 pr-2">
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-xs font-medium",
                          STATUS_LABELS[grant.status].className
                        )}
                      >
                        {STATUS_LABELS[grant.status].label}
                      </span>
                    </td>
                    <td className="py-2 pr-2 text-right">
                      {(grant.status === "active" || grant.status === "scheduled") && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs text-status-error"
                          disabled={revokingId === grant.id}
                          onClick={() => handleRevoke(grant)}
                        >
                          {revokingId === grant.id ? "Revocando..." : "Revocar"}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
