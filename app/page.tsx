import Link from "next/link"
import {
  ArrowRight,
  CircleCheckBig,
  Clock,
  FileText,
  Lock,
  MessageCircle,
  Play,
  Quote,
  ShieldCheck,
  Sparkles,
  User,
  UserRound,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { AboutCard } from "@/components/landing/AboutCard"
import { PropertyCard } from "@/components/landing/PropertyCard"
import { Sparkle } from "@/components/landing/Sparkle"
import { StatTile } from "@/components/landing/StatTile"
import { StepCard } from "@/components/landing/StepCard"

/**
 * Landing de Atracción — identidad "trust blue" (ver .claude/design-system/tokens.md
 * y Rediseño/rediseño/*.png). Fondo lavanda-blanco, cards blancas, titulares navy
 * en serif, acento azul índigo vibrante para CTAs, sparkles dorados puntuales.
 *
 * Estructura: header con nav + CTA pill, hero de dos columnas (copy + imagen de
 * propiedad con card flotante de "propuesta inicial" y mini-stepper), barra de 4
 * stats, sección "Cómo funciona" de 3 pasos conectados, grid de propiedades
 * destacadas, testimonio en cita, banda de CTA final y footer.
 */
export default function Home() {
  return (
    <div className="bg-deep-ambient flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-glass-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-[72px] w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6">
          <div className="flex shrink-0 items-center gap-2.5">
            <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
              <rect width="34" height="34" rx="9" fill="#16204B" />
              <path
                d="M9 19l6-6 4 3 6-7"
                stroke="#2547E5"
                strokeWidth="2.3"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M9 23.5h16" stroke="#2547E5" strokeWidth="2.3" strokeLinecap="round" />
            </svg>
            <span className="font-heading text-xl font-semibold tracking-tight text-text-primary">
              Nodrix
            </span>
          </div>
          <nav className="flex shrink-0 flex-wrap items-center gap-7 text-sm font-semibold text-text-secondary">
            <Link
              href="#nodrix"
              className="hidden transition-colors duration-200 hover:text-text-primary md:inline"
            >
              Nodrix
            </Link>
            <Link
              href="#como-funciona"
              className="hidden transition-colors duration-200 hover:text-text-primary md:inline"
            >
              Cómo funciona
            </Link>
            <Link
              href="#propiedades"
              className="hidden transition-colors duration-200 hover:text-text-primary md:inline"
            >
              Propiedades
            </Link>
            <Link
              href="#asesoria"
              className="hidden transition-colors duration-200 hover:text-text-primary md:inline"
            >
              Asesoría humana
            </Link>
            <Link
              href="#recursos"
              className="hidden transition-colors duration-200 hover:text-text-primary md:inline"
            >
              Recursos
            </Link>
            <Link
              href="/auth/login"
              className="transition-colors duration-200 hover:text-text-primary"
            >
              Iniciar sesión
            </Link>
            <Button
              className="glow-cyan h-10 rounded-full bg-neon-cyan px-5 text-[13.5px] font-bold text-white hover:bg-neon-cyan/90"
              render={<Link href="/auth/register" />}
            >
              Comenzar
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        {/* Hero */}
        <section className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-10 px-6 py-14 sm:py-16 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:py-20">
          <div className="animate-fade-in-up relative flex flex-col gap-5">
            <Sparkle className="absolute top-0 right-6 hidden size-5 sm:block" />
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-secondary px-3.5 py-1.5 text-xs font-bold text-neon-cyan">
              <Sparkles className="size-3.5" aria-hidden="true" />
              Evaluación inteligente con acompañamiento humano
            </span>

            <h1 className="font-heading max-w-lg text-4xl leading-[1.14] font-semibold tracking-tight text-text-primary sm:text-[46px]">
              Descubre qué propiedad sí puede calzar contigo
            </h1>

            <p className="max-w-md text-base leading-relaxed text-text-secondary">
              Analizamos tu perfil financiero, te mostramos alternativas alineadas a tus objetivos
              y te acompañamos paso a paso para que avances con más claridad y confianza.
            </p>

            <div className="flex flex-wrap gap-3">
              <Button
                className="glow-cyan interactive-lift h-[52px] gap-2 rounded-full bg-neon-cyan px-6 text-[15px] font-bold text-white hover:bg-neon-cyan/90"
                render={<Link href="/auth/register" />}
              >
                Comenzar evaluación gratis
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
              <Button
                variant="outline"
                className="interactive-lift h-[52px] gap-2 rounded-full border-input px-5 text-[15px] font-semibold text-text-primary hover:bg-surface-elevated"
                render={<Link href="#como-funciona" />}
              >
                <Play className="size-4 fill-current" aria-hidden="true" />
                Ver cómo funciona
              </Button>
            </div>

            <div className="flex items-center gap-4 pt-1.5">
              <div className="flex">
                <span className="-mr-2 flex size-[30px] items-center justify-center rounded-full border-2 border-surface bg-secondary text-[10px] font-bold text-neon-cyan">
                  MF
                </span>
                <span className="-mr-2 flex size-[30px] items-center justify-center rounded-full border-2 border-surface bg-[#EFE6D4] text-[10px] font-bold text-[#8A6423]">
                  JS
                </span>
                <span className="flex size-[30px] items-center justify-center rounded-full border-2 border-surface bg-[#DEEFE3] text-[10px] font-bold text-[#2E8B63]">
                  RT
                </span>
              </div>
              <span className="text-xs text-text-tertiary">
                +1.200 personas ya dieron el primer paso
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1 text-xs text-text-tertiary">
              <span className="flex items-center gap-1.5">
                <Clock className="size-3.5 text-neon-cyan" aria-hidden="true" />
                Toma menos de 4 minutos
              </span>
              <span className="flex items-center gap-1.5">
                <CircleCheckBig className="size-3.5 text-neon-cyan" aria-hidden="true" />
                Sin compromiso
              </span>
              <span className="flex items-center gap-1.5">
                <Lock className="size-3.5 text-neon-cyan" aria-hidden="true" />
                Tus datos protegidos
              </span>
            </div>
          </div>

          <div
            className="animate-fade-in-up relative flex flex-col gap-3.5"
            style={{ "--animate-delay": "120ms" } as React.CSSProperties}
          >
            <Sparkle className="absolute -top-3 -right-2 z-10 size-6" />
            <div className="interactive-lift overflow-hidden rounded-[20px]">
              {/* Photo by Francesca Tosolini on Unsplash */}
              <img
                src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80"
                alt="Living moderno de propiedad destacada"
                className="h-[340px] w-full object-cover"
              />
            </div>
            <div className="glass-card flex flex-col gap-4 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#DEEFE3]">
                  <CircleCheckBig className="size-5 text-[#22c55e]" aria-hidden="true" />
                </span>
                <div>
                  <div className="text-[13.5px] font-bold text-text-primary">
                    Propuesta inicial en minutos
                  </div>
                  <div className="mt-0.5 text-xs text-text-tertiary">
                    ¡Vas por buen camino! Ya tenemos una propuesta estimada para ti.
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between px-1">
                <div className="flex flex-col items-center gap-1.5">
                  <span className="flex size-7 items-center justify-center rounded-full bg-[#22c55e] text-white">
                    <CircleCheckBig className="size-4" aria-hidden="true" />
                  </span>
                  <span className="text-center text-[10.5px] leading-tight text-text-tertiary">
                    Evaluación
                    <br />
                    completada
                  </span>
                </div>
                <span
                  aria-hidden="true"
                  className="mx-1 mt-[-14px] h-px flex-1 border-t-2 border-dashed border-[#22c55e]/50"
                />
                <div className="flex flex-col items-center gap-1.5">
                  <span className="flex size-7 items-center justify-center rounded-full bg-[#22c55e] text-white">
                    <CircleCheckBig className="size-4" aria-hidden="true" />
                  </span>
                  <span className="text-center text-[10.5px] leading-tight text-text-tertiary">
                    Analizando tu
                    <br />
                    perfil
                  </span>
                </div>
                <span
                  aria-hidden="true"
                  className="mx-1 mt-[-14px] h-px flex-1 border-t-2 border-dashed border-glass-border"
                />
                <div className="flex flex-col items-center gap-1.5">
                  <span className="flex size-7 items-center justify-center rounded-full bg-neon-cyan text-[11px] font-bold text-white">
                    3
                  </span>
                  <span className="text-center text-[10.5px] leading-tight font-semibold text-neon-cyan">
                    Propuesta
                    <br />
                    lista
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Barra de 4 stats */}
        <section className="mx-auto w-full max-w-6xl px-6">
          <div className="glass-card grid grid-cols-1 gap-6 rounded-2xl p-7 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile icon={User} value="+1.200" label="perfiles han iniciado su evaluación" />
            <StatTile
              icon={Sparkles}
              value="Orientación clara y personalizada"
              label="según tu perfil y objetivos"
            />
            <StatTile
              icon={Clock}
              value="Respuesta de un asesor en hasta"
              label=""
              highlight="48 h hábiles"
            />
            <StatTile
              icon={ShieldCheck}
              value="Tu información se mantiene protegida"
              label="con altos estándares de seguridad"
            />
          </div>
        </section>

        {/* Qué es Nodrix -- sección de presentación de la marca, para que quien
            llega por primera vez entienda qué hace la plataforma antes de
            registrarse. Se mantiene deliberadamente honesta: la evaluación es
            una orientación, no una aprobación bancaria (ver disclaimers del
            motor de pre-evaluación). */}
        <section id="nodrix" className="mx-auto w-full max-w-6xl px-6 pt-16 sm:pt-20">
          <div className="mb-10 flex flex-col items-center gap-2.5 text-center">
            <span className="text-xs font-bold tracking-wide text-neon-cyan uppercase">
              Qué es Nodrix
            </span>
            <h2 className="font-heading text-3xl font-semibold text-text-primary">
              Claridad sobre tu capacidad de inversión, antes de dar el paso
            </h2>
            <p className="max-w-2xl text-sm leading-relaxed text-text-secondary">
              Nodrix es una plataforma de inversión inmobiliaria que analiza tu perfil financiero
              y te dice, con reglas claras y explicables, en qué rango de propiedades podrías
              moverte. En vez de recorrer proyectos sin saber si calificas, parte por entender tu
              punto de partida y avanza acompañado por un asesor real.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <AboutCard
              icon={<Sparkles className="size-5" aria-hidden="true" />}
              title="Evaluación en minutos"
              description="Respondes una evaluación breve sobre ingresos, ahorro y objetivos, y obtienes al instante tu categoría y un rango estimado en UF."
              delay={0}
            />
            <AboutCard
              icon={<CircleCheckBig className="size-5" aria-hidden="true" />}
              title="Reglas claras, no cajas negras"
              description="El resultado se calcula con criterios financieros explícitos y siempre te mostramos en qué se basó, para que entiendas el porqué."
              delay={80}
            />
            <AboutCard
              icon={<UserRound className="size-5" aria-hidden="true" />}
              title="Un asesor humano contigo"
              description="Desde la primera etapa tienes un asesor asignado que revisa tus documentos, agenda visitas y te acompaña hasta el cierre."
              delay={160}
            />
            <AboutCard
              icon={<ShieldCheck className="size-5" aria-hidden="true" />}
              title="Seguimiento transparente"
              description="Ves el estado real de tu solicitud en todo momento, paso a paso, sin tener que llamar para preguntar en qué va."
              delay={240}
            />
          </div>

          <p className="mx-auto mt-6 max-w-2xl text-center text-xs leading-relaxed text-text-tertiary">
            La evaluación de Nodrix es una orientación referencial para ayudarte a decidir: no
            constituye una aprobación bancaria. La confirmación final siempre depende de la
            evaluación que haga el banco con tus documentos.
          </p>
        </section>

        {/* Cómo funciona */}
        <section id="como-funciona" className="mx-auto w-full max-w-6xl px-6 pt-16 sm:pt-20">
          <div className="mb-10 flex flex-col items-center gap-2.5 text-center">
            <span className="text-xs font-bold tracking-wide text-neon-cyan uppercase">
              Cómo funciona
            </span>
            <h2 className="font-heading text-3xl font-semibold text-text-primary">
              Un camino simple para tomar decisiones informadas
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <StepCard
              step={1}
              title="Cuéntanos sobre ti"
              description="Completa una evaluación breve sobre ingresos, ahorro y objetivos."
              icon={<FileText className="size-7" aria-hidden="true" />}
              delay={0}
              showConnector
            />
            <StepCard
              step={2}
              title="Descubre tus posibilidades"
              description="Te mostramos una propuesta inicial estimada y oportunidades alineadas a tu perfil."
              icon={<Sparkles className="size-7" aria-hidden="true" />}
              delay={80}
              showConnector
            />
            <StepCard
              step={3}
              title="Avanza acompañado"
              description="Sube tus documentos y continúa junto a un asesor humano en cada etapa."
              icon={<MessageCircle className="size-7" aria-hidden="true" />}
              delay={160}
            />
          </div>
        </section>

        {/* Propiedades destacadas */}
        <section id="propiedades" className="mx-auto w-full max-w-6xl px-6 pt-16 sm:pt-20">
          <div className="mb-8 flex flex-col items-center gap-2.5 text-center">
            <span className="text-xs font-bold tracking-wide text-neon-cyan uppercase">
              Oportunidades para ti
            </span>
            <h2 className="font-heading text-3xl font-semibold text-text-primary">
              Oportunidades que podrían ir contigo
            </h2>
            <p className="max-w-md text-sm text-text-secondary">
              Después de evaluar tu perfil, te mostramos alternativas compatibles con tu objetivo,
              presupuesto y estilo de inversión.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <PropertyCard
              src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80"
              title="Edificio Vista Sur"
              tag="Para vivir"
              location="Ñuñoa, Santiago"
              price="3.200 UF"
              type="Departamento"
              rooms={2}
              baths={1}
              delay={0}
            />
            <PropertyCard
              src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80"
              title="Casa Los Robles"
              tag="Para inversión"
              location="Chicureo, Colina"
              price="8.900 UF"
              type="Casa"
              rooms={4}
              baths={3}
              delay={80}
            />
            <PropertyCard
              src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80"
              title="Studio Centro Cívico"
              tag="Para vivir"
              location="Santiago Centro"
              price="2.350 UF"
              type="Departamento"
              rooms={1}
              baths={1}
              delay={160}
            />
          </div>

          <div className="mt-8 flex justify-center">
            <Button
              variant="outline"
              className="interactive-lift h-11 gap-2 rounded-full border-input px-5 text-sm font-semibold text-text-primary hover:bg-surface-elevated"
              render={<Link href="#propiedades" />}
            >
              Ver más oportunidades
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </section>

        {/* Testimonio */}
        <section className="mx-auto mt-[72px] w-full max-w-3xl px-6">
          <div className="glass-card relative flex flex-col items-center gap-4 overflow-hidden rounded-[20px] p-10 text-center">
            <Sparkle className="absolute top-4 left-6 size-4" />
            <Quote className="size-6 text-neon-cyan" aria-hidden="true" />
            <p className="font-heading max-w-lg text-lg leading-relaxed text-text-primary italic">
              &ldquo;Antes de comenzar no tenía claridad sobre cuánto podía invertir. Con Nodrix
              entendí mis posibilidades y avancé con mucha más tranquilidad.&rdquo;
            </p>
            <div className="flex items-center gap-2.5">
              <span className="flex size-[38px] items-center justify-center rounded-full bg-secondary text-neon-cyan">
                <UserRound className="size-5" aria-hidden="true" />
              </span>
              <div className="text-left">
                <p className="text-[13px] font-bold text-text-primary">María Fernanda R.</p>
                <p className="text-[11.5px] text-text-tertiary">
                  Evaluación completada · Inversionista
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="mx-auto mt-[72px] w-full max-w-6xl px-6">
          <div className="relative flex flex-col items-center gap-5 overflow-hidden rounded-[24px] bg-secondary px-8 py-12 text-center sm:flex-row sm:justify-between sm:text-left">
            <Sparkle className="absolute top-5 right-10 size-5" />
            <div className="flex flex-col items-center gap-2 sm:items-start">
              <h2 className="font-heading text-2xl font-semibold text-text-primary sm:text-[28px]">
                Tu próxima propiedad puede comenzar hoy
              </h2>
              <p className="max-w-md text-sm text-text-secondary">
                Haz tu evaluación inicial gratuita y descubre el siguiente paso con más claridad,
                seguridad y acompañamiento.
              </p>
            </div>
            <Button
              className="glow-cyan interactive-lift h-[52px] shrink-0 gap-2 rounded-full bg-neon-cyan px-6 text-[15px] font-bold text-white hover:bg-neon-cyan/90"
              render={<Link href="/auth/register" />}
            >
              Iniciar mi evaluación
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </section>
      </main>

      <footer className="mt-[72px] border-t border-glass-border">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-7 text-[12.5px] text-text-tertiary">
          <span className="flex items-center gap-2 font-bold text-text-primary">
            <svg width="22" height="22" viewBox="0 0 34 34" aria-hidden="true">
              <rect width="34" height="34" rx="9" fill="#16204B" />
              <path
                d="M9 19l6-6 4 3 6-7"
                stroke="#2547E5"
                strokeWidth="2.3"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M9 23.5h16" stroke="#2547E5" strokeWidth="2.3" strokeLinecap="round" />
            </svg>
            Nodrix
          </span>
          <nav className="flex flex-wrap items-center gap-5">
            <Link href="#" className="transition-colors duration-200 hover:text-text-primary">
              Quiénes somos
            </Link>
            <Link href="#" className="transition-colors duration-200 hover:text-text-primary">
              Centro de ayuda
            </Link>
            <Link href="#" className="transition-colors duration-200 hover:text-text-primary">
              Términos y condiciones
            </Link>
            <Link href="#" className="transition-colors duration-200 hover:text-text-primary">
              Privacidad
            </Link>
          </nav>
          <span>© {new Date().getFullYear()} Nodrix</span>
        </div>
      </footer>
    </div>
  )
}
