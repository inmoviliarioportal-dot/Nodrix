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
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

interface ChangePasswordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Modal para "Cambiar contraseña" — POST /api/auth/change-password, que
 * re-verifica currentPassword antes de aplicar newPassword (ver el route
 * handler para el detalle).
 */
function ChangePasswordDialog({ open, onOpenChange }: ChangePasswordDialogProps) {
  const [currentPassword, setCurrentPassword] = React.useState("")
  const [newPassword, setNewPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (!open) {
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setError(null)
    }
  }, [open])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (newPassword.length < 8) {
      setError("La nueva contraseña debe tener al menos 8 caracteres.")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.")
      return
    }

    setSaving(true)
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        setError(data?.error ?? "No se pudo cambiar la contraseña.")
        return
      }
      toast.success("Contraseña actualizada correctamente.")
      onOpenChange(false)
    } catch {
      setError("Error de conexión. Intenta nuevamente.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cambiar contraseña</DialogTitle>
          <DialogDescription>Ingresa tu contraseña actual y la nueva contraseña.</DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <Field data-invalid={!!error}>
            <FieldLabel htmlFor="currentPassword">Contraseña actual</FieldLabel>
            <Input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              className="bg-surface-elevated border-glass-border"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="newPassword">Nueva contraseña</FieldLabel>
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              className="bg-surface-elevated border-glass-border"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="confirmPassword">Confirmar nueva contraseña</FieldLabel>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              className="bg-surface-elevated border-glass-border"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <FieldError>{error}</FieldError>
          </Field>

          <DialogFooter>
            <Button
              type="submit"
              disabled={saving}
              className="glow-cyan bg-neon-cyan text-deep hover:bg-neon-cyan/90"
            >
              {saving ? "Guardando..." : "Cambiar contraseña"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export { ChangePasswordDialog }
