"use client"

import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"

import { Layout } from "@/components/Layout"
import { AuthCard } from "@/components/auth/AuthCard"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Toaster } from "@/components/ui/sonner"

/**
 * "¿Olvidaste tu contraseña?" — pide el email y dispara
 * POST /api/auth/forgot-password (que a su vez usa
 * supabase.auth.resetPasswordForEmail). Siempre muestra el mismo mensaje de
 * éxito exista o no la cuenta, para no revelar qué emails están registrados.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Ingresa un correo válido")
      return
    }

    setIsSubmitting(true)
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      setSent(true)
    } catch {
      toast.error("Error de conexión. Intenta nuevamente.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Layout className="bg-deep-ambient">
      <Toaster />
      <AuthCard
        title="Recuperar contraseña"
        description="Te enviaremos un enlace para restablecer tu contraseña"
      >
        {sent ? (
          <div className="flex flex-col gap-4 text-center">
            <p className="text-sm text-text-secondary">
              Si <span className="text-text-primary">{email}</span> tiene una cuenta con
              nosotros, recibirás un correo con instrucciones para restablecer tu contraseña.
            </p>
            <Link
              href="/auth/login"
              className="text-sm font-medium text-neon-cyan transition-colors duration-200 hover:underline"
            >
              Volver a iniciar sesión
            </Link>
          </div>
        ) : (
          <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
            <Field data-invalid={!!error}>
              <FieldLabel htmlFor="email">Correo electrónico</FieldLabel>
              <Input
                className="bg-surface-elevated border-glass-border focus-visible:border-neon-cyan focus-visible:ring-neon-cyan/30"
                id="email"
                type="email"
                placeholder="juan@correo.cl"
                autoComplete="email"
                value={email}
                aria-invalid={!!error}
                onChange={(e) => setEmail(e.target.value)}
              />
              <FieldError>{error}</FieldError>
            </Field>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="glow-cyan w-full bg-neon-cyan text-deep hover:bg-neon-cyan/90"
            >
              {isSubmitting ? "Enviando..." : "Enviar enlace de recuperación"}
            </Button>

            <p className="text-center text-sm text-text-secondary">
              <Link
                href="/auth/login"
                className="font-medium text-neon-cyan transition-colors duration-200 hover:underline"
              >
                Volver a iniciar sesión
              </Link>
            </p>
          </form>
        )}
      </AuthCard>
    </Layout>
  )
}
