"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Layout } from "@/components/Layout"
import { AuthCard } from "@/components/auth/AuthCard"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Toaster } from "@/components/ui/sonner"
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"

/**
 * Página a la que apunta el link del email de recuperación
 * (`redirectTo` en POST /api/auth/forgot-password). Supabase Auth deja una
 * sesión de recuperación temporal en el hash de la URL, que el cliente
 * browser detecta automáticamente (`detectSessionInUrl`, default de
 * @supabase/ssr) y dispara el evento `PASSWORD_RECOVERY` — solo entonces
 * se habilita el formulario para fijar la nueva contraseña
 * (`auth.updateUser`, misma sesión temporal, sin necesitar la contraseña
 * anterior).
 */
export default function ResetPasswordPage() {
  const router = useRouter()
  const [ready, setReady] = React.useState(false)
  const [password, setPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  React.useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true)
    })
    // Si la sesión de recuperación ya se estableció antes de que este efecto
    // corriera (carrera con el parseo del hash), revisamos la sesión actual.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.")
      return
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.")
      return
    }

    setIsSubmitting(true)
    try {
      const supabase = createSupabaseBrowserClient()
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) {
        setError(updateError.message)
        return
      }
      toast.success("Contraseña actualizada. Ya puedes iniciar sesión.")
      router.push("/auth/login")
    } catch {
      setError("Error de conexión. Intenta nuevamente.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Layout className="bg-deep-ambient">
      <Toaster />
      <AuthCard title="Restablecer contraseña" description="Ingresa tu nueva contraseña">
        {!ready ? (
          <p className="text-center text-sm text-text-tertiary">
            Verificando enlace de recuperación...
          </p>
        ) : (
          <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
            <Field data-invalid={!!error}>
              <FieldLabel htmlFor="password">Nueva contraseña</FieldLabel>
              <Input
                className="bg-surface-elevated border-glass-border focus-visible:border-neon-cyan focus-visible:ring-neon-cyan/30"
                id="password"
                type="password"
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <PasswordStrengthMeter password={password} />
            </Field>

            <Field data-invalid={!!error}>
              <FieldLabel htmlFor="confirmPassword">Confirmar nueva contraseña</FieldLabel>
              <Input
                className="bg-surface-elevated border-glass-border focus-visible:border-neon-cyan focus-visible:ring-neon-cyan/30"
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <FieldError>{error}</FieldError>
            </Field>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="glow-cyan w-full bg-neon-cyan text-deep hover:bg-neon-cyan/90"
            >
              {isSubmitting ? "Guardando..." : "Restablecer contraseña"}
            </Button>
          </form>
        )}
      </AuthCard>
    </Layout>
  )
}
