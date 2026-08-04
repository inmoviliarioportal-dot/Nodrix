"use client"

import * as React from "react"
import { toast } from "sonner"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

interface StaffUser {
  email?: string | null
  full_name?: string | null
  role?: string | null
}

interface EditStaffProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated?: () => void
}

const ROLE_LABELS: Record<string, string> = {
  asesor: "Asesor",
  admin: "Administrador",
  gerencia: "Gerencia",
}

/**
 * Modal "Editar mis datos" para usuarios de backend (asesor/admin/gerencia)
 * -- separado de `EditProfileDialog` (clientes), que pide RUT, renta, tipo
 * de inversión, etc. Los usuarios `users` solo tienen `full_name` como
 * campo editable (ver database/schema.sql); el email es la identidad de
 * Supabase Auth y no se cambia acá.
 */
function EditStaffProfileDialog({ open, onOpenChange, onUpdated }: EditStaffProfileDialogProps) {
  const [loading, setLoading] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [email, setEmail] = React.useState("")
  const [role, setRole] = React.useState("")
  const [fullName, setFullName] = React.useState("")

  React.useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch("/api/users/me")
      .then((res) => res.json())
      .then((data) => {
        const staffUser: StaffUser = data?.user ?? {}
        setEmail(staffUser.email ?? "")
        setRole(staffUser.role ?? "")
        setFullName(staffUser.full_name ?? "")
      })
      .catch(() => toast.error("No se pudo cargar tu perfil."))
      .finally(() => setLoading(false))
  }, [open])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    try {
      const response = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        toast.error(data?.error ?? "No se pudo actualizar tu perfil.")
        return
      }
      toast.success("Datos actualizados correctamente.")
      onUpdated?.()
      onOpenChange(false)
    } catch {
      toast.error("Error de conexión. Intenta nuevamente.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar mis datos</DialogTitle>
          <DialogDescription>Actualiza tu nombre visible en la plataforma.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="py-6 text-center text-sm text-text-tertiary">Cargando...</p>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <Field>
              <FieldLabel htmlFor="staff-fullName">Nombre completo</FieldLabel>
              <Input
                id="staff-fullName"
                className="bg-surface-elevated border-glass-border"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="staff-email">Correo electrónico</FieldLabel>
              <Input
                id="staff-email"
                className="bg-surface-elevated border-glass-border"
                value={email}
                disabled
              />
            </Field>

            {role && (
              <Field>
                <FieldLabel htmlFor="staff-role">Rol</FieldLabel>
                <Input
                  id="staff-role"
                  className="bg-surface-elevated border-glass-border"
                  value={ROLE_LABELS[role] ?? role}
                  disabled
                />
              </Field>
            )}

            <DialogFooter>
              <Button
                type="submit"
                disabled={saving}
                className="glow-cyan bg-neon-cyan text-deep hover:bg-neon-cyan/90"
              >
                {saving ? "Guardando..." : "Guardar cambios"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

export { EditStaffProfileDialog }
