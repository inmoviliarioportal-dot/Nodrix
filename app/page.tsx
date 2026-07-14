import Link from "next/link"
import { ArrowRight, Users, Sparkles, ShieldCheck, TrendingUp } from "lucide-react"

import { Button } from "@/components/ui/button"
import { TrustBadge } from "@/components/landing/TrustBadge"

/**
 * Landing de Atracción (Fase 1) — cero fricción antes del primer clic.
 * Fondo ambiental full-bleed + hero de alto impacto + CTA único hacia
 * el soft-login (/auth/register, reusa el registro real ya funcional).
 *
 * TODO(soft-login OTP): explorar a futuro un input rápido de email/teléfono
 * aquí mismo que pre-rellene /auth/register vía query param. Requiere un
 * flujo adicional de Supabase Auth (OTP) fuera del scope de este agente —
 * por ahora el camino simple es navegar directo a /auth/register.
 */
export default function Home() {
  return (
    <div className="bg-deep-ambient flex min-h-screen flex-col">
      <header className="w-full">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <span className="text-lg font-semibold tracking-tight text-text-primary">
            Nodrix
          </span>
          <nav className="flex items-center gap-4 text-sm text-text-secondary">
            <Link
              href="/auth/login"
              className="transition-colors duration-200 hover:text-text-primary"
            >
              Iniciar sesión
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-10 px-6 py-16 text-center">
        <div className="flex flex-col items-center gap-6">
          <span className="glass-card inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium text-neon-purple">
            <Sparkles className="size-3.5" aria-hidden="true" />
            Análisis con inteligencia artificial
          </span>

          <h1 className="max-w-3xl text-4xl leading-tight font-semibold tracking-tight text-text-primary sm:text-5xl sm:leading-tight md:text-6xl md:leading-tight">
            Tu futuro patrimonio{" "}
            <span className="text-neon-cyan text-glow-cyan">empieza aquí</span>
          </h1>

          <p className="max-w-xl text-base leading-relaxed text-text-secondary sm:text-lg">
            Evalúa tu capacidad de inversión inmobiliaria en minutos. Nuestro motor
            de scoring analiza tu perfil y te muestra oportunidades reales,
            respaldadas por datos.
          </p>
        </div>

        <Button
          className="glow-cyan h-12 gap-2 rounded-xl bg-neon-cyan px-8 text-base font-medium text-deep hover:bg-neon-cyan/90"
          render={<Link href="/auth/register" />}
        >
          Empezar evaluación
          <ArrowRight className="size-4" aria-hidden="true" />
        </Button>

        <div className="grid w-full max-w-2xl grid-cols-1 gap-3 pt-4 sm:grid-cols-3">
          <TrustBadge icon={Users} label="Miles de inversionistas" glow="cyan" />
          <TrustBadge icon={TrendingUp} label="Análisis con IA" glow="purple" />
          <TrustBadge icon={ShieldCheck} label="100% seguro" glow="green" />
        </div>
      </main>

      <footer className="w-full py-6 text-center text-xs text-text-tertiary">
        © {new Date().getFullYear()} Nodrix — Plataforma Inmobiliaria Inteligente
      </footer>
    </div>
  )
}
