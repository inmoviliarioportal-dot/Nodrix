"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { Layout } from "@/components/Layout"
import { AuthCard } from "@/components/auth/AuthCard"
import {
  registerSchema,
  type RegisterFormData,
  GENDER_OPTIONS,
  INVESTMENT_TYPE_OPTIONS,
  PROPERTY_STATUS_OPTIONS,
} from "@/components/auth/schemas"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Toaster } from "@/components/ui/sonner"

type FormState = Record<keyof RegisterFormData, string>
type FormErrors = Partial<Record<keyof RegisterFormData, string>>

const initialForm: FormState = {
  firstName: "",
  lastName: "",
  rut: "",
  gender: "",
  birthDate: "",
  age: "",
  phone: "",
  email: "",
  monthlyIncome: "",
  investmentType: "",
  propertyStatus: "",
  password: "",
}

const selectClassName =
  "bg-surface-elevated border-glass-border focus-visible:border-neon-cyan focus-visible:ring-neon-cyan/30 h-9 w-full rounded-md border px-3 text-sm text-text-primary outline-none focus-visible:ring-3"

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(initialForm)
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleChange(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const result = registerSchema.safeParse(form)
    if (!result.success) {
      const fieldErrors: FormErrors = {}
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof FormState
        if (!fieldErrors[key]) fieldErrors[key] = issue.message
      }
      setErrors(fieldErrors)
      return
    }

    setErrors({})
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.data),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        const message =
          data?.error ?? data?.message ?? "No pudimos crear tu cuenta. Intenta nuevamente."
        toast.error(message)
        return
      }

      toast.success("Cuenta creada correctamente")
      router.push("/dashboard")
    } catch {
      toast.error("Error de conexión. Intenta nuevamente.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Layout className="bg-deep-ambient">
      <Toaster />
      <div className="flex flex-col gap-2 pt-4 text-center">
        <h1 className="text-2xl font-semibold text-text-primary sm:text-3xl">
          Invierte en propiedades inteligentes
        </h1>
        <p className="text-sm text-text-secondary">
          Crea tu cuenta para comenzar a postular y hacer seguimiento de tu inversión.
        </p>
      </div>

      <AuthCard
        className="max-w-2xl"
        title="Crear cuenta"
        description="Completa tus datos para registrarte"
      >
        <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field data-invalid={!!errors.firstName}>
              <FieldLabel htmlFor="firstName">Nombres</FieldLabel>
              <Input
                className="bg-surface-elevated border-glass-border focus-visible:border-neon-cyan focus-visible:ring-neon-cyan/30"
                id="firstName"
                name="firstName"
                placeholder="Juan"
                autoComplete="given-name"
                value={form.firstName}
                aria-invalid={!!errors.firstName}
                onChange={(e) => handleChange("firstName", e.target.value)}
              />
              <FieldError>{errors.firstName}</FieldError>
            </Field>

            <Field data-invalid={!!errors.lastName}>
              <FieldLabel htmlFor="lastName">Apellidos</FieldLabel>
              <Input
                className="bg-surface-elevated border-glass-border focus-visible:border-neon-cyan focus-visible:ring-neon-cyan/30"
                id="lastName"
                name="lastName"
                placeholder="Pérez González"
                autoComplete="family-name"
                value={form.lastName}
                aria-invalid={!!errors.lastName}
                onChange={(e) => handleChange("lastName", e.target.value)}
              />
              <FieldError>{errors.lastName}</FieldError>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field data-invalid={!!errors.rut}>
              <FieldLabel htmlFor="rut">RUT</FieldLabel>
              <Input
                className="bg-surface-elevated border-glass-border focus-visible:border-neon-cyan focus-visible:ring-neon-cyan/30"
                id="rut"
                name="rut"
                placeholder="12345678-9"
                value={form.rut}
                aria-invalid={!!errors.rut}
                onChange={(e) => handleChange("rut", e.target.value)}
              />
              <FieldError>{errors.rut}</FieldError>
            </Field>

            <Field data-invalid={!!errors.gender}>
              <FieldLabel htmlFor="gender">Sexo</FieldLabel>
              <select
                id="gender"
                name="gender"
                className={selectClassName}
                value={form.gender}
                aria-invalid={!!errors.gender}
                onChange={(e) => handleChange("gender", e.target.value)}
              >
                <option value="" disabled>
                  Selecciona
                </option>
                {GENDER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <FieldError>{errors.gender}</FieldError>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field data-invalid={!!errors.birthDate}>
              <FieldLabel htmlFor="birthDate">Fecha de nacimiento</FieldLabel>
              <Input
                className="bg-surface-elevated border-glass-border focus-visible:border-neon-cyan focus-visible:ring-neon-cyan/30"
                id="birthDate"
                name="birthDate"
                type="date"
                autoComplete="bday"
                value={form.birthDate}
                aria-invalid={!!errors.birthDate}
                onChange={(e) => handleChange("birthDate", e.target.value)}
              />
              <FieldError>{errors.birthDate}</FieldError>
            </Field>

            <Field data-invalid={!!errors.age}>
              <FieldLabel htmlFor="age">Edad</FieldLabel>
              <Input
                className="bg-surface-elevated border-glass-border focus-visible:border-neon-cyan focus-visible:ring-neon-cyan/30"
                id="age"
                name="age"
                type="number"
                min={18}
                max={120}
                placeholder="30"
                value={form.age}
                aria-invalid={!!errors.age}
                onChange={(e) => handleChange("age", e.target.value)}
              />
              <FieldError>{errors.age}</FieldError>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field data-invalid={!!errors.phone}>
              <FieldLabel htmlFor="phone">Teléfono</FieldLabel>
              <Input
                className="bg-surface-elevated border-glass-border focus-visible:border-neon-cyan focus-visible:ring-neon-cyan/30"
                id="phone"
                name="phone"
                type="tel"
                placeholder="+56 9 1234 5678"
                autoComplete="tel"
                value={form.phone}
                aria-invalid={!!errors.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
              />
              <FieldError>{errors.phone}</FieldError>
            </Field>

            <Field data-invalid={!!errors.email}>
              <FieldLabel htmlFor="email">Correo electrónico</FieldLabel>
              <Input
                className="bg-surface-elevated border-glass-border focus-visible:border-neon-cyan focus-visible:ring-neon-cyan/30"
                id="email"
                name="email"
                type="email"
                placeholder="juan@correo.cl"
                autoComplete="email"
                value={form.email}
                aria-invalid={!!errors.email}
                onChange={(e) => handleChange("email", e.target.value)}
              />
              <FieldError>{errors.email}</FieldError>
            </Field>
          </div>

          <Field data-invalid={!!errors.monthlyIncome}>
            <FieldLabel htmlFor="monthlyIncome">Renta líquida mensual (CLP)</FieldLabel>
            <Input
              className="bg-surface-elevated border-glass-border focus-visible:border-neon-cyan focus-visible:ring-neon-cyan/30"
              id="monthlyIncome"
              name="monthlyIncome"
              type="number"
              min={0}
              step={1000}
              placeholder="1200000"
              value={form.monthlyIncome}
              aria-invalid={!!errors.monthlyIncome}
              onChange={(e) => handleChange("monthlyIncome", e.target.value)}
            />
            <FieldError>{errors.monthlyIncome}</FieldError>
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field data-invalid={!!errors.investmentType}>
              <FieldLabel htmlFor="investmentType">Tipo de inversión</FieldLabel>
              <select
                id="investmentType"
                name="investmentType"
                className={selectClassName}
                value={form.investmentType}
                aria-invalid={!!errors.investmentType}
                onChange={(e) => handleChange("investmentType", e.target.value)}
              >
                <option value="" disabled>
                  Selecciona
                </option>
                {INVESTMENT_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <FieldError>{errors.investmentType}</FieldError>
            </Field>

            <Field data-invalid={!!errors.propertyStatus}>
              <FieldLabel htmlFor="propertyStatus">Estado del inmueble</FieldLabel>
              <select
                id="propertyStatus"
                name="propertyStatus"
                className={selectClassName}
                value={form.propertyStatus}
                aria-invalid={!!errors.propertyStatus}
                onChange={(e) => handleChange("propertyStatus", e.target.value)}
              >
                <option value="" disabled>
                  Selecciona
                </option>
                {PROPERTY_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <FieldError>{errors.propertyStatus}</FieldError>
            </Field>
          </div>

          <Field data-invalid={!!errors.password}>
            <FieldLabel htmlFor="password">Contraseña</FieldLabel>
            <Input
              className="bg-surface-elevated border-glass-border focus-visible:border-neon-cyan focus-visible:ring-neon-cyan/30"
              id="password"
              name="password"
              type="password"
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
              value={form.password}
              aria-invalid={!!errors.password}
              onChange={(e) => handleChange("password", e.target.value)}
            />
            <FieldError>{errors.password}</FieldError>
          </Field>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="glow-cyan w-full bg-neon-cyan text-deep hover:bg-neon-cyan/90"
          >
            {isSubmitting ? "Creando cuenta..." : "Registrarse"}
          </Button>
        </form>

        <p className="text-center text-sm text-text-secondary">
          ¿Ya tienes cuenta?{" "}
          <Link
            href="/auth/login"
            className="font-medium text-neon-cyan transition-colors duration-200 hover:underline"
          >
            Inicia sesión
          </Link>
        </p>
      </AuthCard>
    </Layout>
  )
}
