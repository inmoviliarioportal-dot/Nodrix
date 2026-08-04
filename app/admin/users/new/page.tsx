"use client"

import * as React from "react"
import Link from "next/link"
import { toast } from "sonner"
import { UserPlus, IdCard, Phone, ShieldCheck, ArrowLeft } from "lucide-react"

import { Toaster } from "@/components/ui/sonner"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter"
import { isValidRut, formatRut } from "@/lib/rut"

type CreatorRole = "admin" | "gerencia"

const ROLE_OPTIONS_BY_CREATOR: Record<CreatorRole, { value: string; label: string }[]> = {
  admin: [
    { value: "asesor", label: "Asesor" },
    { value: "gerencia", label: "Gerencia" },
    { value: "custom", label: "Rol personalizado..." },
  ],
  gerencia: [{ value: "asesor", label: "Asesor" }],
}

interface CustomRoleOption {
  id: string
  name: string
}

const selectClassName =
  "bg-surface-elevated border-glass-border focus-visible:border-neon-cyan focus-visible:ring-neon-cyan/30 h-9 w-full rounded-md border px-3 text-sm text-text-primary outline-none focus-visible:ring-3"

/**
 * Creación de usuarios internos (staff) -- gerencia solo puede crear
 * asesores; admin puede crear asesores, gerencia y roles personalizados (ver
 * app/api/admin/users/route.ts para la restricción real, esta página solo
 * espeja las opciones visibles). Pide datos completos (RUT, nombres,
 * apellidos, teléfono, correo) porque `full_name`/`phone`/`rut` se
 * consumen en varios lugares del sitio -- ej. el nombre del asesor y su
 * teléfono real alimentan el WhatsAppBubble del dashboard del cliente.
 */
export default function CreateUserPage() {
  const [creatorRole, setCreatorRole] = React.useState<CreatorRole | null>(null)
  const [firstName, setFirstName] = React.useState("")
  const [lastName, setLastName] = React.useState("")
  const [rut, setRut] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [role, setRole] = React.useState("")
  const [customRoleId, setCustomRoleId] = React.useState("")
  const [customRoles, setCustomRoles] = React.useState<CustomRoleOption[]>([])
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

    fetch("/api/admin/custom-roles")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setCustomRoles(data?.roles ?? []))
      .catch(() => {})
  }, [])

  const roleOptions = creatorRole ? ROLE_OPTIONS_BY_CREATOR[creatorRole] : []

  function handleRutBlur() {
    if (rut.trim() && isValidRut(rut)) setRut(formatRut(rut))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!firstName.trim() || !lastName.trim() || !rut.trim() || !email.trim() || !role) {
      setError("Completa todos los campos obligatorios.")
      return
    }
    if (!isValidRut(rut)) {
      setError("El RUT ingresado no es válido.")
      return
    }
    if (role === "custom" && !customRoleId) {
      setError("Selecciona un rol personalizado.")
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
        body: JSON.stringify({
          email,
          password,
          firstName,
          lastName,
          rut,
          phone: phone || undefined,
          role,
          ...(role === "custom" ? { customRoleId } : {}),
        }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        setError(data?.error ?? "No se pudo crear el usuario.")
        return
      }
      toast.success(`Usuario ${firstName} ${lastName} creado correctamente.`)
      setFirstName("")
      setLastName("")
      setRut("")
      setPhone("")
      setEmail("")
      setPassword("")
      setRole("")
      setCustomRoleId("")
    } catch {
      setError("Error de conexión. Intenta nuevamente.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Toaster />
      <div className="flex flex-col gap-2">
        <Link
          href="/admin/users"
          className="flex w-fit items-center gap-1.5 text-xs font-medium text-text-tertiary transition-colors duration-200 hover:text-text-primary"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Volver a Usuarios
        </Link>
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-neon-cyan/10 text-neon-cyan">
            <UserPlus className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="font-heading text-2xl font-semibold text-text-primary">Crear usuario</h1>
            <p className="text-sm text-text-secondary">
              {creatorRole === "gerencia"
                ? "Como gerencia, puedes crear cuentas de asesor."
                : "Como admin, puedes crear cuentas de asesor, gerencia o con rol personalizado."}
            </p>
          </div>
        </div>
      </div>

      <div className="glass-card max-w-2xl rounded-2xl p-6 sm:p-8">
        <form className="flex flex-col gap-6" onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-4">
            <h2 className="flex items-center gap-2 font-heading text-sm font-semibold text-text-primary">
              <IdCard className="size-4 text-neon-cyan" aria-hidden="true" />
              Identidad
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="firstName">Nombres</FieldLabel>
                <Input
                  id="firstName"
                  className="bg-surface-elevated border-glass-border"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Sofía"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="lastName">Apellidos</FieldLabel>
                <Input
                  id="lastName"
                  className="bg-surface-elevated border-glass-border"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Hernández"
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="rut">RUT</FieldLabel>
              <Input
                id="rut"
                className="bg-surface-elevated border-glass-border"
                value={rut}
                onChange={(e) => setRut(e.target.value)}
                onBlur={handleRutBlur}
                placeholder="12.345.678-9"
              />
            </Field>
          </div>

          <div className="flex flex-col gap-4">
            <h2 className="flex items-center gap-2 font-heading text-sm font-semibold text-text-primary">
              <Phone className="size-4 text-neon-cyan" aria-hidden="true" />
              Contacto
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                <FieldLabel htmlFor="phone">Teléfono (opcional)</FieldLabel>
                <Input
                  id="phone"
                  type="tel"
                  className="bg-surface-elevated border-glass-border"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+56 9 1234 5678"
                />
              </Field>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <h2 className="flex items-center gap-2 font-heading text-sm font-semibold text-text-primary">
              <ShieldCheck className="size-4 text-neon-cyan" aria-hidden="true" />
              Acceso
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="role">Rol</FieldLabel>
                <select id="role" className={selectClassName} value={role} onChange={(e) => setRole(e.target.value)}>
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

              {role === "custom" && (
                <Field>
                  <FieldLabel htmlFor="customRoleId">Rol personalizado</FieldLabel>
                  <select
                    id="customRoleId"
                    className={selectClassName}
                    value={customRoleId}
                    onChange={(e) => setCustomRoleId(e.target.value)}
                  >
                    <option value="" disabled>
                      {customRoles.length === 0 ? "No hay roles creados aún" : "Selecciona un rol"}
                    </option>
                    {customRoles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
            </div>

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
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || !creatorRole}
            className="glow-cyan bg-neon-cyan text-deep hover:bg-neon-cyan/90 w-fit"
          >
            {isSubmitting ? "Creando..." : "Crear usuario"}
          </Button>
        </form>
      </div>
    </div>
  )
}
