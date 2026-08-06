"use client"

import * as React from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Users, UserPlus, Search, Ban, CheckCircle2, Pencil } from "lucide-react"

import { Toaster } from "@/components/ui/sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { formatRut } from "@/lib/rut"
import { EditStaffUserDialog } from "@/components/admin/EditStaffUserDialog"

interface StaffUserRow {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  full_name: string | null
  rut: string | null
  phone: string | null
  role: string
  active: boolean
  created_at: string
}

const ROLE_LABELS: Record<string, string> = {
  asesor: "Asesor",
  admin: "Administrador",
  gerencia: "Gerencia",
  custom: "Rol personalizado",
}

/**
 * Mantenedor de usuarios de backend: lista solo los roles que el creador
 * actual puede gestionar (gerencia -> solo asesores; admin -> asesor,
 * gerencia y roles personalizados -- nunca otras cuentas admin, ver
 * GET /api/admin/users), con búsqueda y toggle de habilitar/deshabilitar.
 * Deshabilitar NO borra la cuenta: solo bloquea el login (ver
 * PATCH /api/admin/users/[id] y el chequeo de `active` en los guards de rol).
 */
export default function UsersMaintainerPage() {
  const [users, setUsers] = React.useState<StaffUserRow[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [updatingId, setUpdatingId] = React.useState<string | null>(null)
  const [creatorRole, setCreatorRole] = React.useState<string | null>(null)
  const [editingUser, setEditingUser] = React.useState<StaffUserRow | null>(null)

  // Solo admin puede editar datos/contraseña -- gerencia puede crear
  // usuarios pero no editarlos (control de acceso pedido explícitamente).
  const canEdit = creatorRole === "admin"

  React.useEffect(() => {
    fetch("/api/auth/user")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setCreatorRole(data?.role ?? null))
      .catch(() => {})
  }, [])

  const load = React.useCallback(() => {
    setLoading(true)
    fetch("/api/admin/users")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUsers(data?.users ?? []))
      .finally(() => setLoading(false))
  }, [])

  React.useEffect(() => {
    load()
  }, [load])

  const filtered = React.useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return users
    return users.filter(
      (u) =>
        (u.full_name ?? "").toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        (u.rut ?? "").toLowerCase().includes(term)
    )
  }, [users, search])

  async function toggleActive(user: StaffUserRow) {
    setUpdatingId(user.id)
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !user.active }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        toast.error(data?.error ?? "No se pudo actualizar el usuario.")
        return
      }
      toast.success(user.active ? `${user.full_name} deshabilitado.` : `${user.full_name} habilitado.`)
      load()
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Toaster />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-neon-cyan/10 text-neon-cyan">
            <Users className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="font-heading text-2xl font-semibold text-text-primary">Usuarios</h1>
            <p className="text-sm text-text-secondary">Gestiona las cuentas de backend a tu cargo.</p>
          </div>
        </div>
        <Button className="glow-cyan bg-neon-cyan text-deep hover:bg-neon-cyan/90 gap-2" render={<Link href="/admin/users/new" />}>
          <UserPlus className="size-4" aria-hidden="true" />
          Crear usuario
        </Button>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-tertiary" aria-hidden="true" />
        <Input
          className="bg-surface-elevated border-glass-border pl-9"
          placeholder="Buscar por nombre, correo o RUT..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="glass-card overflow-x-auto rounded-2xl p-4">
        {loading ? (
          <p className="p-4 text-sm text-text-tertiary">Cargando...</p>
        ) : filtered.length === 0 ? (
          <p className="p-4 text-sm text-text-tertiary">No hay usuarios que calcen con la búsqueda.</p>
        ) : (
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-glass-border text-left text-xs uppercase tracking-wide text-text-tertiary">
                <th className="py-2 pr-2">Nombre</th>
                <th className="py-2 pr-2">RUT</th>
                <th className="py-2 pr-2">Correo</th>
                <th className="py-2 pr-2">Teléfono</th>
                <th className="py-2 pr-2">Rol</th>
                <th className="py-2 pr-2">Estado</th>
                <th className="py-2 pr-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr
                  key={user.id}
                  className={cn("border-b border-glass-border/50", !user.active && "opacity-50")}
                >
                  <td className="py-2 pr-2 text-text-secondary">{user.full_name || "—"}</td>
                  <td className="py-2 pr-2 text-text-secondary">{user.rut ? formatRut(user.rut) : "—"}</td>
                  <td className="py-2 pr-2 text-text-secondary">{user.email}</td>
                  <td className="py-2 pr-2 text-text-secondary">{user.phone || "—"}</td>
                  <td className="py-2 pr-2 text-text-secondary">{ROLE_LABELS[user.role] ?? user.role}</td>
                  <td className="py-2 pr-2">
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-xs font-medium",
                        user.active
                          ? "border-success/40 bg-success/10 text-success"
                          : "border-error/40 bg-error/10 text-error"
                      )}
                    >
                      {user.active ? "Activo" : "Deshabilitado"}
                    </span>
                  </td>
                  <td className="py-2 pr-2">
                    <div className="flex items-center justify-end gap-2">
                      {canEdit && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1.5 px-2 text-xs"
                          onClick={() => setEditingUser(user)}
                        >
                          <Pencil className="size-3.5" aria-hidden="true" />
                          Editar
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className={cn("h-7 gap-1.5 px-2 text-xs", user.active ? "text-error" : "text-success")}
                        disabled={updatingId === user.id}
                        onClick={() => toggleActive(user)}
                      >
                        {user.active ? (
                          <>
                            <Ban className="size-3.5" aria-hidden="true" />
                            Deshabilitar
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="size-3.5" aria-hidden="true" />
                            Habilitar
                          </>
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {canEdit && (
        <EditStaffUserDialog
          user={editingUser}
          onOpenChange={(open) => !open && setEditingUser(null)}
          onUpdated={() => {
            setEditingUser(null)
            load()
          }}
        />
      )}
    </div>
  )
}
