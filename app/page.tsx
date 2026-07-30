import Link from "next/link"
import {
  ArrowRight,
  Sparkles,
  CircleCheckBig,
  Quote,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { StatTile } from "@/components/landing/StatTile"
import { StepCard } from "@/components/landing/StepCard"

/**
 * Landing de Atracción — rediseñada para calzar con el mockup de referencia
 * del negocio ("Nodrix - Rediseño Completo.html", pantalla Landing).
 *
 * Estructura: header con logo navy+oro y nav, hero de dos columnas (copy +
 * imagen de propiedad con card flotante de resultado de scoring), franja de
 * stats sobre fondo navy sólido, sección "Cómo funciona" de 3 pasos con
 * badges numerados navy, grid de 3 propiedades destacadas, testimonio final
 * y footer — todo con la paleta "real estate editorial" (navy #16324F +
 * oro #B8863C sobre fondo cálido) documentada en tokens.md.
 */
export default function Home() {
  return (
    <div className="bg-deep-ambient flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-glass-border bg-surface">
        <div className="mx-auto flex h-[72px] w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6">
          <div className="flex shrink-0 items-center gap-2.5">
            <svg width="36" height="36" viewBox="0 0 34 34" aria-hidden="true">
              <rect width="34" height="34" rx="9" fill="#16324F" />
              <path
                d="M9 19l6-6 4 3 6-7"
                stroke="#B8863C"
                strokeWidth="2.3"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M9 23.5h16" stroke="#B8863C" strokeWidth="2.3" strokeLinecap="round" />
            </svg>
            <span className="font-heading text-xl font-semibold tracking-tight text-text-primary">
              Nodrix
            </span>
          </div>
          <nav className="flex shrink-0 flex-wrap items-center gap-7 text-sm font-semibold text-text-secondary">
            <Link
              href="#como-funciona"
              className="hidden transition-colors duration-200 hover:text-text-primary sm:inline"
            >
              Cómo funciona
            </Link>
            <Link
              href="#propiedades"
              className="hidden transition-colors duration-200 hover:text-text-primary sm:inline"
            >
              Propiedades
            </Link>
            <Link
              href="/auth/login"
              className="transition-colors duration-200 hover:text-text-primary"
            >
              Iniciar sesión
            </Link>
            <Button
              className="h-10 rounded-[10px] bg-neon-cyan px-5 text-[13.5px] font-bold text-white hover:bg-neon-cyan/90"
              render={<Link href="/auth/register" />}
            >
              Comenzar
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        {/* Hero */}
        <section className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-10 px-6 py-14 sm:py-16 lg:grid-cols-[1.05fr_1fr] lg:gap-12 lg:py-20">
          <div className="flex flex-col gap-5">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[#EFE6D4] px-3.5 py-1.5 text-xs font-bold text-[#8A6423]">
              <Sparkles className="size-3.5" aria-hidden="true" />
              Scoring con inteligencia artificial
            </span>

            <h1 className="font-heading max-w-lg text-4xl leading-[1.12] font-semibold tracking-tight text-text-primary sm:text-[46px]">
              Encuentra y financia tu próxima propiedad con claridad total
            </h1>

            <p className="max-w-md text-base leading-relaxed text-text-secondary">
              Evaluamos tu capacidad de inversión en minutos, te mostramos oportunidades reales
              según tu perfil y te acompañamos con un asesor humano hasta el cierre.
            </p>

            <div className="flex flex-wrap gap-3">
              <Button
                className="glow-cyan h-[52px] gap-2 rounded-xl bg-neon-cyan px-6 text-[15px] font-bold text-white hover:bg-neon-cyan/90"
                render={<Link href="/auth/register" />}
              >
                Iniciar evaluación gratuita
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
              <Button
                variant="outline"
                className="h-[52px] rounded-xl border-input px-5 text-[15px] font-semibold text-text-primary hover:bg-surface-elevated"
                render={<Link href="#como-funciona" />}
              >
                Ver cómo funciona
              </Button>
            </div>

            <div className="flex items-center gap-4 pt-1.5">
              <div className="flex">
                <span className="-mr-2 flex size-[30px] items-center justify-center rounded-full border-2 border-surface bg-[#DCE6EA] text-[10px] font-bold text-neon-cyan">
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
                +1.200 inversionistas ya evaluaron su perfil
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3.5">
            <div className="overflow-hidden rounded-[20px]">
              {/* Photo by Francesca Tosolini on Unsplash */}
              <img
                src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80"
                alt="Fachada de propiedad destacada"
                className="h-[340px] w-full object-cover"
              />
            </div>
            <div className="glass-card flex gap-3.5 rounded-2xl p-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-[11px] bg-[#EFE6D4]">
                <CircleCheckBig className="size-5 text-[#8A6423]" aria-hidden="true" />
              </span>
              <div>
                <div className="text-[13.5px] font-bold text-text-primary">
                  Categoría Oro asignada
                </div>
                <div className="mt-0.5 text-xs text-text-tertiary">
                  Perfil evaluado en 4 minutos, con propuesta financiera lista.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Franja de stats sobre fondo navy */}
        <section className="mt-2 bg-neon-cyan">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-5 px-6 py-11 text-center sm:grid-cols-4">
            <StatTile value="+1.200" label="Solicitudes evaluadas" onDark />
            <StatTile value="94%" label="Precisión del scoring" onDark />
            <StatTile value="48h" label="Tiempo de respuesta" onDark />
            <StatTile value="100%" label="Datos encriptados" onDark />
          </div>
        </section>

        {/* Cómo funciona */}
        <section id="como-funciona" className="mx-auto w-full max-w-6xl px-6 pt-16 sm:pt-20">
          <div className="mb-10 flex flex-col items-center gap-2.5 text-center">
            <span className="text-xs font-bold tracking-wide text-gold uppercase">
              Cómo funciona
            </span>
            <h2 className="font-heading text-3xl font-semibold text-text-primary">
              De tu perfil a tu propuesta, en tres pasos
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <StepCard
              step={1}
              title="Completa tu perfil"
              description="Un wizard de menos de 3 minutos recoge tu situación laboral, ingresos y ahorro disponible."
            />
            <StepCard
              step={2}
              title="Recibe tu scoring al instante"
              description="Calculamos tu categoría (Bronce a Platino) y una propuesta financiera a tu medida."
            />
            <StepCard
              step={3}
              title="Conecta con tu asesor"
              description="Sube tus documentos y sigue el avance en tiempo real junto a un asesor dedicado."
            />
          </div>
        </section>

        {/* Propiedades destacadas */}
        <section id="propiedades" className="mx-auto w-full max-w-6xl px-6 pt-16 sm:pt-20">
          <div className="mb-8 flex flex-col items-center gap-2.5 text-center">
            <span className="text-xs font-bold tracking-wide text-gold uppercase">
              Propiedades
            </span>
            <h2 className="font-heading text-3xl font-semibold text-text-primary">
              Oportunidades para tu categoría
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {[
              {
                src: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
                title: "Depto. Vista al Parque",
                tag: "Oro",
                location: "Providencia, Santiago",
                price: "UF 4.200",
                rooms: "2D · 2B",
              },
              {
                src: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80",
                title: "Casa Los Robles",
                tag: "Platino",
                location: "Chicureo, Colina",
                price: "UF 8.900",
                rooms: "4D · 3B",
              },
              {
                src: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80",
                title: "Studio Centro Cívico",
                tag: "Plata",
                location: "Santiago Centro",
                price: "UF 2.350",
                rooms: "1D · 1B",
              },
            ].map((pc) => (
              <div
                key={pc.title}
                className="glass-card flex flex-col overflow-hidden rounded-2xl p-0"
              >
                <img
                  src={pc.src}
                  alt={pc.title}
                  className="h-[170px] w-full object-cover"
                />
                <div className="flex flex-col gap-2 p-[18px]">
                  <div className="flex items-center justify-between">
                    <span className="text-[14.5px] font-bold text-text-primary">{pc.title}</span>
                    <span className="rounded-full bg-[#EFE6D4] px-2.5 py-0.5 text-[10.5px] font-bold tracking-wide text-[#8A6423] uppercase">
                      {pc.tag}
                    </span>
                  </div>
                  <p className="text-xs text-text-tertiary">{pc.location}</p>
                  <div className="mt-1 flex items-center justify-between border-t border-glass-border pt-1.5">
                    <span className="font-heading text-[17px] font-semibold text-text-primary">
                      {pc.price}
                    </span>
                    <span className="text-xs text-text-tertiary">{pc.rooms}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Testimonio final */}
        <section className="mx-auto mt-[72px] w-full max-w-3xl px-6">
          <div className="glass-card flex flex-col items-center gap-4 rounded-[20px] p-10 text-center">
            <Quote className="size-6 text-gold" aria-hidden="true" />
            <p className="font-heading max-w-lg text-lg leading-relaxed text-text-primary italic">
              "En menos de una semana tuve claridad total sobre mi capacidad de inversión y una
              propuesta concreta."
            </p>
            <div className="flex items-center gap-2.5">
              <span className="flex size-[38px] items-center justify-center rounded-full bg-[#EFE6D4] text-xs font-bold text-[#8A6423]">
                MF
              </span>
              <div className="text-left">
                <p className="text-[13px] font-bold text-text-primary">María Fernanda R.</p>
                <p className="text-[11.5px] text-text-tertiary">Inversionista, categoría Oro</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-[72px] border-t border-glass-border">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-7 text-[12.5px] text-text-tertiary">
          <span className="flex items-center gap-2 font-bold text-text-primary">
            <svg width="22" height="22" viewBox="0 0 34 34" aria-hidden="true">
              <rect width="34" height="34" rx="9" fill="#16324F" />
              <path
                d="M9 19l6-6 4 3 6-7"
                stroke="#B8863C"
                strokeWidth="2.3"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M9 23.5h16" stroke="#B8863C" strokeWidth="2.3" strokeLinecap="round" />
            </svg>
            Nodrix
          </span>
          <span>© {new Date().getFullYear()} Nodrix — Plataforma Inmobiliaria Inteligente</span>
        </div>
      </footer>
    </div>
  )
}
