"use client"

import * as React from "react"
import { toast } from "sonner"

import { Toaster } from "@/components/ui/sonner"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const MODULES = [
  { key: "bandeja", label: "Bandeja de leads" },
  { key: "visitas", label: "Visitas" },
  { key: "documentos", label: "Documentos" },
  { key: "scoring", label: "Scoring" },
  { key: "usuarios", label: "Usuarios" },
  { key: "reportes", label: "Reportes" },
] as const

type ModuleKey = (typeof MODULES)[number]["key"]
type Level = "none" | "view" | "edit"
type PermissionMap = Record<ModuleKey, Level>

const EMPTY_PERMISSIONS: PermissionMap = {
  bandeja: "none",
  visitas: "none",
  documentos: "none",
  scoring: "none",
  usuarios: "none",
  reportes: "none",
}

interface CustomRole {
  id: string
  name: string
  permissions: PermissionMap
  created_at: string
}

const LEVEL_OPTIONS: { value: Level; label: string }[] = [
  { value: "none", label: "Sin acceso" },
  { value: "view", label: "Ver" },
  { value: "edit", label: "Editar" },
]

function PermissionMatrix({
  permissions,
  onChange,
}: {
  permissions: PermissionMap
  onChange: (module: ModuleKey, level: Level) => void
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-glass-border text-left text-xs uppercase tracking-wide text-text-tertiary">
            <th className="py-2 pr-2">Módulo</th>
            {LEVEL_OPTIONS.map((opt) => (
              <th key={opt.value} className="px-2 py-2 text-center">
                {opt.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MODULES.map((module) => (
            <tr key={module.key} className="border-b border-glass-border/50">
              <td className="py-2 pr-2 text-text-secondary">{module.label}</td>
              {LEVEL_OPTIONS.map((opt) => (
                <td key={opt.value} className="px-2 py-2 text-center">
                  <input
                    type="radio"
                    name={`${module.key}`}
                    checked={permissions[module.key] === opt.value}
                    onChange={() => onChange(module.key, opt.value)}
                    className="size-4 accent-neon-cyan"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Gestión de roles personalizados: el admin define nombre + una matriz de
 * permisos (Sin acceso/Ver/Editar) por módulo. Sirve para armar roles como
 * "consulta" (todo en Ver) o "solo reagendamiento" (Visitas -> Editar, el
 * resto en Sin acceso). Solo `admin` puede crear roles (gerencia no).
 */
export default function RolesPage() {
  const [roles, setRoles] = React.useState<CustomRole[]>([])
  const [loading, setLoading] = React.useState(true)
  const [creatorRole, setCreatorRole] = React.useState<string | null>(null)
  const [name, setName] = React.useState("")
  const [permissions, setPermissions] = React.useState<PermissionMap>({ ...EMPTY_PERMISSIONS })
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
    fetch("/api/auth/user")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setCreatorRole(data?.role ?? null))
      .catch(() => {})
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
    const hasAnyAccess = MODULES.some((m) => permissions[m.key] !== "none")
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

  if (creatorRole && creatorRole !== "admin") {
    return (
      <div className="glass-card rounded-2xl p-6 text-sm text-text-secondary">
        Solo el rol <span className="font-semibold text-text-primary">admin</span> puede crear y editar roles
        personalizados.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <Toaster />
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold text-text-primary">Roles personalizados</h1>
        <p className="text-sm text-text-secondary">
          Define qué puede ver y editar cada rol. Ej: un rol "consulta" con todo en Ver, o "solo reagendamiento" con
          Visitas en Editar y el resto en Sin acceso.
        </p>
      </div>

      <div className="glass-card rounded-2xl p-6">
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

          <PermissionMatrix permissions={permissions} onChange={(m, l) => setPermissions((p) => ({ ...p, [m]: l }))} />

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
        <h2 className="mb-4 font-heading text-sm font-semibold uppercase tracking-wide text-text-tertiary">
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
                  "flex flex-wrap items-center justify-between gap-2 rounded-lg border border-glass-border p-3",
                  editingId === role.id && "border-neon-cyan/50"
                )}
              >
                <div>
                  <p className="text-sm font-medium text-text-primary">{role.name}</p>
                  <p className="text-xs text-text-tertiary">
                    {MODULES.filter((m) => role.permissions[m.key] !== "none")
                      .map((m) => `${m.label}: ${role.permissions[m.key] === "edit" ? "Editar" : "Ver"}`)
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
