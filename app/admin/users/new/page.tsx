"use client"

import * as React from "react"
import { toast } from "sonner"

import { Toaster } from "@/components/ui/sonner"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter"

type CreatorRole = "admin" | "gerencia"

const ROLE_OPTIONS_BY_CREATOR: Record<CreatorRole, { value: string; label: string }[]> = {
  admin: [
    { value: "asesor", label: "Asesor" },
    { value: "gerencia", label: "Gerencia" },
  ],
  gerencia: [{ value: "asesor", label: "Asesor" }],
}

const selectClassName =
  "bg-surface-elevated border-glass-border focus-visible:border-neon-cyan focus-visible:ring-neon-cyan/30 h-9 w-full rounded-md border px-3 text-sm text-text-primary outline-none focus-visible:ring-3"

/**
 * Creación de usuarios internos (staff) -- gerencia solo puede crear
 * asesores; admin puede crear asesores y gerencia (ver
 * app/api/admin/users/route.ts para la restricción real, esta página solo
 * espeja las opciones visibles).
 */
export default function CreateUserPage() {
  const [creatorRole, setCreatorRole] = React.useState<CreatorRole | null>(null)
  const [fullName, setFullName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [role, setRole] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  React.useEffect(() => {
    fetch("/api/auth/user")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const r = data?.role
        if (r === "admin" || r === "gerencia") setCreatorRole(r)
      })
      .catch(() => {})
  }, [])

  const roleOptions = creatorRole ? ROLE_OPTIONS_BY_CREATOR[creatorRole] : []

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!fullName.trim() || !email.trim() || !role) {
      setError("Completa todos los campos.")
      return
    }
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.")
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, fullName, role }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        setError(data?.error ?? "No se pudo crear el usuario.")
        return
      }
      toast.success(`Usuario ${fullName} creado correctamente.`)
      setFullName("")
      setEmail("")
      setPassword("")
      setRole("")
    } catch {
      setError("Error de conexión. Intenta nuevamente.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Toaster />
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold text-text-primary">Crear usuario</h1>
        <p className="text-sm text-text-secondary">
          {creatorRole === "gerencia"
            ? "Como gerencia, puedes crear cuentas de asesor."
            : "Como admin, puedes crear cuentas de asesor y gerencia."}
        </p>
      </div>

      <div className="glass-card max-w-lg rounded-2xl p-6">
        <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          <Field>
            <FieldLabel htmlFor="fullName">Nombre completo</FieldLabel>
            <Input
              id="fullName"
              className="bg-surface-elevated border-glass-border"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Sofía Hernández"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="email">Correo electrónico</FieldLabel>
            <Input
              id="email"
              type="email"
              className="bg-surface-elevated border-glass-border"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="asesor@nodrix.dev"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="role">Rol</FieldLabel>
            <select
              id="role"
              className={selectClassName}
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="" disabled>
                Selecciona un rol
              </option>
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field data-invalid={!!error}>
            <FieldLabel htmlFor="password">Contraseña temporal</FieldLabel>
            <Input
              id="password"
              type="password"
              className="bg-surface-elevated border-glass-border"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
            />
            <PasswordStrengthMeter password={password} />
            <FieldError>{error}</FieldError>
          </Field>

          <Button
            type="submit"
            disabled={isSubmitting || !creatorRole}
            className="glow-cyan bg-neon-cyan text-deep hover:bg-neon-cyan/90"
          >
            {isSubmitting ? "Creando..." : "Crear usuario"}
          </Button>
        </form>
      </div>
    </div>
  )
}
