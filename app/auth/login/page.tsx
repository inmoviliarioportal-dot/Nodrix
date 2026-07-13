"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { Layout } from "@/components/Layout"
import { AuthCard } from "@/components/auth/AuthCard"
import { loginSchema, type LoginFormData } from "@/components/auth/schemas"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Toaster } from "@/components/ui/sonner"

type FormState = LoginFormData
type FormErrors = Partial<Record<keyof FormState, string>>

const initialForm: FormState = {
  email: "",
  password: "",
}

export default function LoginPage() {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(initialForm)
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleChange(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const result = loginSchema.safeParse(form)
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
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.data),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        const message =
          data?.error ?? data?.message ?? "Credenciales inválidas. Intenta nuevamente."
        toast.error(message)
        return
      }

      toast.success("Sesión iniciada correctamente")
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
      <AuthCard title="Iniciar sesión" description="Ingresa tus credenciales para continuar">
        <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
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

          <Field data-invalid={!!errors.password}>
            <div className="flex items-center justify-between gap-2">
              <FieldLabel htmlFor="password">Contraseña</FieldLabel>
              <Link
                href="#"
                className="text-xs text-text-tertiary transition-colors duration-200 hover:text-gold"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
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
            {isSubmitting ? "Ingresando..." : "Entrar"}
          </Button>
        </form>

        <p className="text-center text-sm text-text-secondary">
          ¿No tienes cuenta?{" "}
          <Link
            href="/auth/register"
            className="font-medium text-gold transition-colors duration-200 hover:underline"
          >
            Regístrate
          </Link>
        </p>
      </AuthCard>
    </Layout>
  )
}
