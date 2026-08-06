"use client"

import * as React from "react"
import { toast } from "sonner"

import { Toaster } from "@/components/ui/sonner"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  PermissionMatrix,
  buildPermissionMap,
  PERMISSION_MODULES,
} from "@/components/admin/roles/PermissionMatrix"
import { TemporaryGrantsPanel } from "@/components/admin/roles/TemporaryGrantsPanel"
// SOLO tipos de lib/permissions -- ver la nota en PermissionMatrix.tsx.
import type { ConfigurableRole, PermissionMap as PermissionMapT } from "@/lib/permissions"

const EMPTY_PERMISSIONS = buildPermissionMap("none")

const ROLE_LABELS: Record<ConfigurableRole, string> = {
  asesor: "Asesor",
  gerencia: "Gerencia",
}

interface CustomRole {
  id: string
  name: string
  permissions: PermissionMapT
  created_at: string
}

interface RolePermissionsEntry {
  role: ConfigurableRole | "admin"
  configurable: boolean
  hasOverride: boolean
  permissions: PermissionMapT
  defaults: PermissionMapT
}

/**
 * Panel de un perfil configurable (asesor / gerencia): carga su override
 * actual (o el default si no hay override guardado) desde
 * GET /api/admin/role-permissions?role=<role> y guarda con
 * PUT /api/admin/role-permissions. Estado de carga/guardado independiente
 * por instancia, así editar gerencia no bloquea la de asesor.
 */
function ConfigurableRolePanel({ role }: { role: ConfigurableRole }) {
  const [permissions, setPermissions] = React.useState<PermissionMapT>(EMPTY_PERMISSIONS)
  const [hasOverride, setHasOverride] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)

  const load = React.useCallback(() => {
    setLoading(true)
    fetch(`/api/admin/role-permissions?role=${role}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: RolePermissionsEntry | null) => {
        if (data?.permissions) setPermissions(data.permissions)
        setHasOverride(Boolean(data?.hasOverride))
      })
      .finally(() => setLoading(false))
  }, [role])

  React.useEffect(() => {
    load()
  }, [load])

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/role-permissions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, permissions }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        toast.error(data?.error ?? `No se pudieron guardar los permisos de ${ROLE_LABELS[role]}.`)
        return
      }
      setHasOverride(true)
      toast.success(`Permisos de ${ROLE_LABELS[role]} actualizados. El menú se ajustará en la próxima sesión.`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="font-heading text-sm font-semibold tracking-wide text-text-tertiary uppercase">
          Permisos de {ROLE_LABELS[role]}
        </h2>
        <p className="text-xs text-text-tertiary">
          Los módulos en "Sin acceso" desaparecen del menú de {ROLE_LABELS[role].toLowerCase()}.
          {!hasOverride && !loading && " Todavía no hay una configuración guardada -- se muestra el default del sistema."}
        </p>
      </div>
      {loading ? (
        <p className="text-sm text-text-tertiary">Cargando...</p>
      ) : (
        <>
          <PermissionMatrix
            name={`role-${role}`}
            permissions={permissions}
            onChange={(module, level) => setPermissions((p) => ({ ...p, [module]: level }))}
          />
          <Button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="glow-cyan bg-neon-cyan text-deep hover:bg-neon-cyan/90 mt-4 w-fit"
          >
            {saving ? "Guardando..." : `Guardar permisos de ${ROLE_LABELS[role]}`}
          </Button>
        </>
      )}
    </div>
  )
}

/** Vista de solo lectura de `admin`: nunca es editable, ver ADMIN_ENTRY en el
 * endpoint (configurable:false). Se explica por qué en la misma tarjeta para
 * que no parezca un bug de la UI. */
function AdminReadOnlyPanel() {
  const [permissions, setPermissions] = React.useState<PermissionMapT>(EMPTY_PERMISSIONS)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    fetch("/api/admin/role-permissions?role=admin")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: RolePermissionsEntry | null) => {
        if (data?.permissions) setPermissions(data.permissions)
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="font-heading text-sm font-semibold tracking-wide text-text-tertiary uppercase">
          Permisos de Admin (solo lectura)
        </h2>
        <p className="text-xs text-text-tertiary">
          Admin es superusuario y no es configurable: siempre tiene acceso total. Restringirlo podría dejar el
          sistema sin nadie capaz de administrarlo, así que esta matriz solo se muestra a modo informativo.
        </p>
      </div>
      {loading ? (
        <p className="text-sm text-text-tertiary">Cargando...</p>
      ) : (
        <PermissionMatrix name="role-admin" permissions={permissions} disabled />
      )}
    </div>
  )
}

/**
 * Gestión de roles personalizados: el admin define nombre + una matriz de
 * permisos (Sin acceso/Ver/Editar) por módulo, derivada de `PERMISSION_MODULES`.
 * Sirve para armar roles como "consulta" (todo en Ver) o "solo reagendamiento"
 * (Visitas -> Editar, el resto en Sin acceso). Solo `admin` puede crearlos.
 */
function CustomRolesPanel() {
  const [roles, setRoles] = React.useState<CustomRole[]>([])
  const [loading, setLoading] = React.useState(true)
  const [name, setName] = React.useState("")
  const [permissions, setPermissions] = React.useState<PermissionMapT>(EMPTY_PERMISSIONS)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const load = React.useCallback(() => {
    setLoading(true)
    fetch("/api/admin/custom-roles")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setRoles(data?.roles ?? []))
      .finally(() => setLoading(false))
  }, [])

  React.useEffect(() => {
    load()
  }, [load])

  function resetForm() {
    setName("")
    setPermissions({ ...EMPTY_PERMISSIONS })
    setEditingId(null)
  }

  function startEdit(role: CustomRole) {
    setEditingId(role.id)
    setName(role.name)
    setPermissions({ ...EMPTY_PERMISSIONS, ...role.permissions })
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!name.trim()) {
      toast.error("El rol necesita un nombre.")
      return
    }
    const hasAnyAccess = PERMISSION_MODULES.some((m) => permissions[m] !== "none")
    if (!hasAnyAccess) {
      toast.error("Marca al menos un módulo con Ver o Editar.")
      return
    }

    setIsSubmitting(true)
    try {
      const url = editingId ? `/api/admin/custom-roles/${editingId}` : "/api/admin/custom-roles"
      const method = editingId ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, permissions }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        toast.error(data?.error ?? "No se pudo guardar el rol.")
        return
      }
      toast.success(editingId ? "Rol actualizado." : "Rol creado.")
      resetForm()
      load()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="glass-card rounded-2xl p-6">
        <div className="mb-4 flex flex-col gap-1">
          <h2 className="font-heading text-sm font-semibold tracking-wide text-text-tertiary uppercase">
            {editingId ? "Editar rol personalizado" : "Nuevo rol personalizado"}
          </h2>
          <p className="text-xs text-text-tertiary">
            Ej: un rol "consulta" con todo en Ver, o "solo reagendamiento" con Visitas en Editar y el resto en Sin
            acceso.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="name">Nombre del rol</FieldLabel>
            <Input
              id="name"
              className="bg-surface-elevated border-glass-border max-w-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Consulta"
            />
          </Field>

          <PermissionMatrix
            name="custom-role"
            permissions={permissions}
            onChange={(m, l) => setPermissions((p) => ({ ...p, [m]: l }))}
          />

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="glow-cyan bg-neon-cyan text-deep hover:bg-neon-cyan/90 w-fit"
            >
              {isSubmitting ? "Guardando..." : editingId ? "Guardar cambios" : "Crear rol"}
            </Button>
            {editingId && (
              <Button type="button" variant="outline" className="w-fit" onClick={resetForm}>
                Cancelar edición
              </Button>
            )}
          </div>
        </form>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <h2 className="mb-4 font-heading text-sm font-semibold tracking-wide text-text-tertiary uppercase">
          Roles existentes
        </h2>
        {loading ? (
          <p className="text-sm text-text-tertiary">Cargando...</p>
        ) : roles.length === 0 ? (
          <p className="text-sm text-text-tertiary">Todavía no hay roles personalizados.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {roles.map((role) => (
              <div
                key={role.id}
                className={cn(
                  "border-glass-border flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3",
                  editingId === role.id && "border-neon-cyan/50"
                )}
              >
                <div>
                  <p className="text-sm font-medium text-text-primary">{role.name}</p>
                  <p className="text-xs text-text-tertiary">
                    {PERMISSION_MODULES.filter((m) => role.permissions[m] !== "none")
                      .map(
                        (m) =>
                          `${m}: ${role.permissions[m] === "edit" ? "Editar" : "Ver"}`
                      )
                      .join(" · ") || "Sin permisos"}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => startEdit(role)}>
                  Editar
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

type SectionKey = "asesor" | "gerencia" | "admin" | "custom" | "grants"

const SECTIONS: { key: SectionKey; label: string }[] = [
  { key: "asesor", label: "Perfil Asesor" },
  { key: "gerencia", label: "Perfil Gerencia" },
  { key: "admin", label: "Perfil Admin" },
  { key: "custom", label: "Roles personalizados" },
  { key: "grants", label: "Permisos temporales" },
]

/**
 * Pantalla /admin/roles: matriz de permisos (derivada de PERMISSION_MODULES /
 * NAV_REGISTRY, ver components/admin/roles/PermissionMatrix.tsx) para los
 * perfiles configurables (asesor, gerencia), la vista de solo lectura de
 * admin, los roles personalizados y los permisos temporales por usuario.
 * Solo `admin` puede abrir esta pantalla (guard en page.tsx).
 */
export default function RolesPage() {
  const [creatorRole, setCreatorRole] = React.useState<string | null>(null)
  const [section, setSection] = React.useState<SectionKey>("asesor")

  React.useEffect(() => {
    fetch("/api/auth/user")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setCreatorRole(data?.role ?? null))
      .catch(() => {})
  }, [])

  if (creatorRole && creatorRole !== "admin") {
    return (
      <div className="glass-card rounded-2xl p-6 text-sm text-text-secondary">
        Solo el rol <span className="font-semibold text-text-primary">admin</span> puede ver y editar roles y
        permisos.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <Toaster />
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold text-text-primary">Roles y permisos</h1>
        <p className="text-sm text-text-secondary">
          Controla qué ve y edita cada perfil (asesor, gerencia), gestiona roles personalizados y otorga permisos
          temporales por usuario. Cada vista del menú corresponde a un módulo de esta matriz -- las nuevas vistas
          aparecen solas al agregarse al registro de navegación.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setSection(s.key)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors duration-200",
              section === s.key
                ? "border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan"
                : "border-glass-border text-text-secondary hover:text-text-primary"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {section === "asesor" && <ConfigurableRolePanel role="asesor" />}
      {section === "gerencia" && <ConfigurableRolePanel role="gerencia" />}
      {section === "admin" && <AdminReadOnlyPanel />}
      {section === "custom" && <CustomRolesPanel />}
      {section === "grants" && <TemporaryGrantsPanel />}
    </div>
  )
}
