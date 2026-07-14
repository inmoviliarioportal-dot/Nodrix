import Link from "next/link"
import {
  ArrowRight,
  BadgeCheck,
  Users,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  LayoutDashboard,
  Wand2,
  Quote,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { TrustBadge } from "@/components/landing/TrustBadge"
import { StatTile } from "@/components/landing/StatTile"
import { StepCard } from "@/components/landing/StepCard"
import { FeatureCard } from "@/components/landing/FeatureCard"

/**
 * Landing de Atracción — rediseñada con la skill UI/UX Pro Max.
 *
 * Sistema elegido (ver explicación completa entregada al usuario):
 * - Estilo: dark premium + glassmorphism (mantiene la identidad ya validada
 *   en el resto de la plataforma — Portal Cliente, Backoffice, Admin —
 *   pero reestructurado con secciones de contenido reales en vez de un
 *   hero solitario).
 * - Paleta: fondo casi-negro (`--deep`) + 4 acentos semánticos ya definidos
 *   en tokens.md — cian (análisis/tech), púrpura (asesoría humana), verde
 *   (seguridad/aprobación) y oro (`--gold`, resultados/premium) — validado
 *   contra la paleta de referencia "Fintech/Trust" (navy + gold + purple).
 * - Tipografía: Lexend (titulares) + Source Sans 3 (cuerpo) — "Corporate
 *   Trust" pairing: geométrica y de alta legibilidad, pensada para
 *   fintech/banca/seguros, evita el tono "boutique inmobiliario de lujo"
 *   de una serif clásica y encaja con el resto de la UI orientada a datos.
 */
export default function Home() {
  return (
    <div className="bg-deep-ambient flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-glass-border bg-deep/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <span className="font-heading text-lg font-semibold tracking-tight text-text-primary">
            Nodrix
          </span>
          <nav className="flex items-center gap-6 text-sm text-text-secondary">
            <Link
              href="#como-funciona"
              className="hidden transition-colors duration-200 hover:text-text-primary sm:inline"
            >
              Cómo funciona
            </Link>
            <Link
              href="#features"
              className="hidden transition-colors duration-200 hover:text-text-primary sm:inline"
            >
              Plataforma
            </Link>
            <Link
              href="/auth/login"
              className="transition-colors duration-200 hover:text-text-primary"
            >
              Iniciar sesión
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        {/* Hero */}
        <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center gap-10 px-6 py-20 text-center sm:py-28">
          <div className="flex flex-col items-center gap-6">
            <span className="glass-card inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium text-neon-purple">
              <Sparkles className="size-3.5" aria-hidden="true" />
              Análisis con inteligencia artificial
            </span>

            <h1 className="font-heading max-w-3xl text-4xl leading-tight font-semibold tracking-tight text-text-primary sm:text-5xl sm:leading-tight md:text-6xl md:leading-tight">
              Tu futuro patrimonio{" "}
              <span className="text-neon-cyan text-glow-cyan">empieza aquí</span>
            </h1>

            <p className="max-w-xl text-base leading-relaxed text-text-secondary sm:text-lg">
              Evalúa tu capacidad de inversión inmobiliaria en minutos. Nuestro motor
              de scoring analiza tu perfil y te muestra oportunidades reales,
              respaldadas por datos y acompañadas por un asesor experto.
            </p>
          </div>

          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <Button
              className="glow-cyan h-12 gap-2 rounded-xl bg-neon-cyan px-8 text-base font-medium text-deep hover:bg-neon-cyan/90"
              render={<Link href="/auth/register" />}
            >
              Empezar evaluación
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              className="h-12 gap-2 rounded-xl px-6 text-base font-medium text-text-secondary hover:bg-white/5 hover:text-text-primary"
              render={<Link href="#como-funciona" />}
            >
              Ver cómo funciona
            </Button>
          </div>

          <div className="grid w-full max-w-2xl grid-cols-1 gap-3 pt-2 sm:grid-cols-3">
            <TrustBadge icon={Users} label="Miles de inversionistas" glow="cyan" />
            <TrustBadge icon={TrendingUp} label="Análisis con IA" glow="purple" />
            <TrustBadge icon={ShieldCheck} label="100% seguro" glow="green" />
          </div>
        </section>

        {/* Barra de confianza / stats */}
        <section className="border-y border-glass-border bg-surface/60">
          <div className="mx-auto grid w-full max-w-5xl grid-cols-2 gap-3 px-6 py-10 sm:grid-cols-4">
            <StatTile value="+1.200" label="Solicitudes evaluadas" glow="cyan" />
            <StatTile value="94%" label="Precisión del scoring" glow="purple" />
            <StatTile value="48h" label="Tiempo promedio de respuesta" glow="green" />
            <StatTile value="100%" label="Datos encriptados" glow="gold" />
          </div>
        </section>

        {/* Cómo funciona */}
        <section id="como-funciona" className="mx-auto w-full max-w-5xl px-6 py-20 sm:py-24">
          <div className="mb-12 flex flex-col items-center gap-3 text-center">
            <span className="text-xs font-semibold tracking-wide text-neon-cyan uppercase">
              Cómo funciona
            </span>
            <h2 className="font-heading text-3xl font-semibold text-text-primary sm:text-4xl">
              De tu perfil a tu propuesta, en tres pasos
            </h2>
            <p className="max-w-xl text-sm text-text-secondary sm:text-base">
              Sin formularios eternos ni respuestas genéricas — cada paso está
              diseñado para llegar rápido a una propuesta real.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StepCard
              step={1}
              icon={Wand2}
              title="Completa tu perfil"
              description="Un wizard de menos de 2 minutos recoge tus datos financieros clave: renta, ahorro y propósito de inversión."
            />
            <StepCard
              step={2}
              icon={TrendingUp}
              title="Recibe tu scoring al instante"
              description="Nuestro motor determinístico calcula tu categoría (Bronce a Platino) y te muestra una propuesta de inversión a medida."
            />
            <StepCard
              step={3}
              icon={Users}
              title="Conecta con tu asesor"
              description="Sube tus documentos desde tu portal y sigue el avance de tu solicitud junto a un asesor asignado en tiempo real."
            />
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-y border-glass-border bg-surface/60">
          <div className="mx-auto w-full max-w-5xl px-6 py-20 sm:py-24">
            <div className="mb-12 flex flex-col items-center gap-3 text-center">
              <span className="text-xs font-semibold tracking-wide text-neon-purple uppercase">
                La plataforma
              </span>
              <h2 className="font-heading text-3xl font-semibold text-text-primary sm:text-4xl">
                Todo lo que necesitas para invertir con confianza
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FeatureCard
                icon={TrendingUp}
                title="Scoring inteligente"
                description="Un motor de reglas determinístico —no una caja negra— evalúa renta, ahorro, estabilidad laboral y carga financiera."
                glow="cyan"
              />
              <FeatureCard
                icon={LayoutDashboard}
                title="Portal de seguimiento"
                description="Visualiza el estado de tu solicitud en tiempo real, desde la recepción hasta el cierre de la operación."
                glow="purple"
              />
              <FeatureCard
                icon={ShieldCheck}
                title="Seguridad de nivel bancario"
                description="Tus documentos y datos financieros viajan cifrados y se almacenan bajo los mismos estándares que usan los bancos."
                glow="green"
              />
              <FeatureCard
                icon={BadgeCheck}
                title="Asesoría personalizada"
                description="Un asesor humano acompaña cada solicitud aprobada, disponible por chat directo desde tu portal."
                glow="gold"
              />
            </div>
          </div>
        </section>

        {/* Social proof */}
        <section className="mx-auto w-full max-w-3xl px-6 py-20 sm:py-24">
          <div className="glass-card flex flex-col items-center gap-6 rounded-2xl p-8 text-center sm:p-10">
            <Quote className="size-8 text-neon-cyan" aria-hidden="true" />
            <p className="font-heading max-w-xl text-lg leading-relaxed text-text-primary sm:text-xl">
              "En menos de una semana tuve claridad total sobre mi capacidad de
              inversión y una propuesta concreta. El seguimiento en el portal
              hizo que todo se sintiera transparente."
            </p>
            <div className="flex items-center gap-3">
              <span className="glow-purple flex size-10 items-center justify-center rounded-full border border-neon-purple bg-neon-purple/10 text-sm font-semibold text-neon-purple">
                MF
              </span>
              <div className="text-left">
                <p className="text-sm font-medium text-text-primary">María Fernanda R.</p>
                <p className="text-xs text-text-tertiary">Inversionista, categoría Oro</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="border-t border-glass-border bg-surface/60">
          <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-6 px-6 py-20 text-center sm:py-24">
            <h2 className="font-heading max-w-2xl text-3xl font-semibold text-text-primary sm:text-4xl">
              Descubre tu categoría de inversión en menos de 2 minutos
            </h2>
            <p className="max-w-xl text-sm text-text-secondary sm:text-base">
              Sin compromiso, sin costo. Solo necesitas responder algunas preguntas
              sobre tu situación financiera.
            </p>
            <Button
              className="glow-cyan h-12 gap-2 rounded-xl bg-neon-cyan px-8 text-base font-medium text-deep hover:bg-neon-cyan/90"
              render={<Link href="/auth/register" />}
            >
              Empezar evaluación
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-glass-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-6 py-8 text-center sm:flex-row sm:justify-between sm:text-left">
          <span className="font-heading text-sm font-semibold text-text-primary">Nodrix</span>
          <nav className="flex items-center gap-6 text-xs text-text-tertiary">
            <Link href="/auth/login" className="transition-colors duration-200 hover:text-text-primary">
              Iniciar sesión
            </Link>
            <Link href="/auth/register" className="transition-colors duration-200 hover:text-text-primary">
              Crear cuenta
            </Link>
          </nav>
          <span className="text-xs text-text-tertiary">
            © {new Date().getFullYear()} Nodrix — Plataforma Inmobiliaria Inteligente
          </span>
        </div>
      </footer>
    </div>
  )
}
