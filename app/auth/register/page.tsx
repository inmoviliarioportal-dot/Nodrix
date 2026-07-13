"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { Layout } from "@/components/Layout"
import { AuthCard } from "@/components/auth/AuthCard"
import { registerSchema, type RegisterFormData } from "@/components/auth/schemas"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Toaster } from "@/components/ui/sonner"

type FormState = RegisterFormData
type FormErrors = Partial<Record<keyof FormState, string>>

const initialForm: FormState = {
  name: "",
  email: "",
  phone: "",
  password: "",
}

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
    <Layout>
      <Toaster />
      <div className="flex flex-col gap-2 pt-4 text-center">
        <h1 className="text-2xl font-semibold text-text-primary sm:text-3xl">
          Invierte en propiedades inteligentes
        </h1>
        <p className="text-sm text-text-secondary">
          Crea tu cuenta para comenzar a postular y hacer seguimiento de tu inversión.
        </p>
      </div>

      <AuthCard title="Crear cuenta" description="Completa tus datos para registrarte">
        <form
          className="flex flex-col gap-5"
          onSubmit={handleSubmit}
          noValidate
        >
          <Field data-invalid={!!errors.name}>
            <FieldLabel htmlFor="name">Nombre completo</FieldLabel>
            <Input
              id="name"
              name="name"
              placeholder="Juan Pérez"
              autoComplete="name"
              value={form.name}
              aria-invalid={!!errors.name}
              onChange={(e) => handleChange("name", e.target.value)}
            />
            <FieldError>{errors.name}</FieldError>
          </Field>

          <Field data-invalid={!!errors.email}>
            <FieldLabel htmlFor="email">Correo electrónico</FieldLabel>
            <Input
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

          <Field data-invalid={!!errors.phone}>
            <FieldLabel htmlFor="phone">Teléfono</FieldLabel>
            <Input
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

          <Field data-invalid={!!errors.password}>
            <FieldLabel htmlFor="password">Contraseña</FieldLabel>
            <Input
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
            className="w-full bg-gold text-dark-primary hover:bg-gold/90"
          >
            {isSubmitting ? "Creando cuenta..." : "Registrarse"}
          </Button>
        </form>

        <p className="text-center text-sm text-text-secondary">
          ¿Ya tienes cuenta?{" "}
          <Link
            href="/auth/login"
            className="font-medium text-gold transition-colors duration-200 hover:underline"
          >
            Inicia sesión
          </Link>
        </p>
      </AuthCard>
    </Layout>
  )
}
