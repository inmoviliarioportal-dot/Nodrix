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
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter"
import { isValidRut, formatRut } from "@/lib/rut"

interface StaffUserRow {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  rut: string | null
  phone: string | null
}

interface EditStaffUserDialogProps {
  user: StaffUserRow | null
  onOpenChange: (open: boolean) => void
  onUpdated: () => void
}

/**
 * Editar datos + cambiar contraseña de un usuario de backend -- SOLO
 * admin puede abrir este diálogo (ver app/admin/users/page.tsx, gerencia
 * no ve el botón "Editar"). El backend (PATCH/../password) vuelve a
 * exigir admin de todas formas, este componente no es el único control de
 * acceso.
 */
function EditStaffUserDialog({ user, onOpenChange, onUpdated }: EditStaffUserDialogProps) {
  const [firstName, setFirstName] = React.useState("")
  const [lastName, setLastName] = React.useState("")
  const [rut, setRut] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const [newPassword, setNewPassword] = React.useState("")
  const [savingProfile, setSavingProfile] = React.useState(false)
  const [savingPassword, setSavingPassword] = React.useState(false)

  React.useEffect(() => {
    if (!user) return
    setFirstName(user.first_name ?? "")
    setLastName(user.last_name ?? "")
    setRut(user.rut ? formatRut(user.rut) : "")
    setPhone(user.phone ?? "")
    setNewPassword("")
  }, [user])

  async function handleSaveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user) return
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("Nombres y apellidos son requeridos.")
      return
    }
    if (rut.trim() && !isValidRut(rut)) {
      toast.error("El RUT ingresado no es válido.")
      return
    }
    setSavingProfile(true)
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, phone, rut: rut || undefined }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        toast.error(data?.error ?? "No se pudo actualizar el usuario.")
        return
      }
      toast.success("Datos actualizados.")
      onUpdated()
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleChangePassword() {
    if (!user) return
    if (newPassword.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres.")
      return
    }
    setSavingPassword(true)
    try {
      const res = await fetch(`/api/admin/users/${user.id}/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        toast.error(data?.error ?? "No se pudo cambiar la contraseña.")
        return
      }
      toast.success("Contraseña actualizada.")
      setNewPassword("")
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <Dialog open={!!user} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar usuario</DialogTitle>
          <DialogDescription>{user?.email}</DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={handleSaveProfile}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="edit-staff-firstName">Nombres</FieldLabel>
              <Input
                id="edit-staff-firstName"
                className="bg-surface-elevated border-glass-border"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-staff-lastName">Apellidos</FieldLabel>
              <Input
                id="edit-staff-lastName"
                className="bg-surface-elevated border-glass-border"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="edit-staff-rut">RUT</FieldLabel>
              <Input
                id="edit-staff-rut"
                className="bg-surface-elevated border-glass-border"
                value={rut}
                onChange={(e) => setRut(e.target.value)}
                placeholder="12.345.678-9"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-staff-phone">Teléfono</FieldLabel>
              <Input
                id="edit-staff-phone"
                type="tel"
                className="bg-surface-elevated border-glass-border"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </Field>
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={savingProfile}
              className="glow-cyan bg-neon-cyan text-deep hover:bg-neon-cyan/90"
            >
              {savingProfile ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </form>

        <div className="border-glass-border mt-2 flex flex-col gap-3 border-t pt-4">
          <FieldLabel htmlFor="edit-staff-password">Nueva contraseña</FieldLabel>
          <Input
            id="edit-staff-password"
            type="password"
            className="bg-surface-elevated border-glass-border"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            autoComplete="new-password"
          />
          <PasswordStrengthMeter password={newPassword} />
          <Button
            type="button"
            variant="outline"
            disabled={savingPassword || newPassword.length === 0}
            onClick={handleChangePassword}
            className="w-fit"
          >
            {savingPassword ? "Actualizando..." : "Cambiar contraseña"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export { EditStaffUserDialog }
