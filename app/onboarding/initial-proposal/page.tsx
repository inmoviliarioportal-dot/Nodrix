"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, Sparkles } from "lucide-react"

import { InitialProposalCard } from "@/components/dashboard/InitialProposalCard"
import { PropertyPreferencesCard } from "@/components/dashboard/PropertyPreferencesCard"
import { AvatarPresenter } from "@/components/avatar/AvatarPresenter"

const TRACKER_STEPS = ["Pre-evaluación completada", "Define tu objetivo", "Sube tus documentos"]

/**
 * Mini-tracker de 3 pasos que acompaña el cierre del wizard -- puramente
 * visual, no gobierna navegación (eso lo sigue haciendo `step`/`Step` más
 * abajo). `currentIndex` 1 = recién llegó a elegir su objetivo, 2 = ya lo
 * eligió y está viendo/aceptando propiedades (el siguiente paso real es
 * subir documentos).
 *
 * Paleta indigo/azul (no la navy+oro del resto del sitio) -- pedido
 * explícito del negocio para que esta pantalla puntual (cierre del wizard)
 * replique tal cual una referencia visual aportada, con línea punteada
 * conectando los pasos como en la referencia.
 */
function StepTracker({ currentIndex }: { currentIndex: number }) {
  return (
    <div className="mx-auto mb-8 flex w-fit flex-wrap items-center gap-2.5 rounded-full border border-[#E0E7FF] bg-white px-4 py-2.5 shadow-[0_1px_3px_rgba(30,27,75,0.06)] sm:gap-3">
      {TRACKER_STEPS.map((label, i) => (
        <React.Fragment key={label}>
          {i > 0 && (
            <span
              className="w-5 shrink-0 border-t-2 border-dotted border-[#C7D2FE] sm:w-8"
              aria-hidden="true"
            />
          )}
          <span className="flex items-center gap-1.5 whitespace-nowrap px-1 text-[12.5px] font-semibold">
            <span
              className={
                i < currentIndex
                  ? "flex size-6 items-center justify-center rounded-full bg-[#2563EB] text-white"
                  : i === currentIndex
                    ? "flex size-6 items-center justify-center rounded-full bg-[#2563EB] text-white"
                    : "flex size-6 items-center justify-center rounded-full border border-[#E0E7FF] text-[#94A3B8]"
              }
            >
              {i < currentIndex ? <CheckCircle2 className="size-3.5" aria-hidden="true" /> : i + 1}
            </span>
            <span className={i === currentIndex ? "text-[#1E1B4B]" : "text-[#94A3B8]"}>{label}</span>
          </span>
        </React.Fragment>
      ))}
    </div>
  )
}

const OUTPUT_KEY = "onboarding-result"

// Pasos del flujo tras elegir la propuesta inicial. "ambos" recorre
// investment-proposal -> housing-preferences EN SECUENCIA antes del cierre;
// "inversion" solo pasa por investment-proposal; "vivienda_propia" solo por
// housing-preferences.
type Step = "initial-proposal" | "investment-proposal" | "housing-preferences" | "closing-avatar"

/**
 * Paso del onboarding INMEDIATAMENTE después de que la pantalla de
 * procesamiento (AI Processing) llega a 100%: el cliente elige su propuesta
 * inicial (simulación de riesgo por tramo de departamentos) ANTES de pasar
 * a su panel. Reutiliza el mismo `InitialProposalCard` que se muestra como
 * fallback en el dashboard (si el cliente sale de acá sin elegir y vuelve
 * después, lo ve ahí igual).
 *
 * Tras elegir la propuesta inicial, el flujo se bifurca según `purpose`:
 * - "inversion": va directo a la propuesta de 1/2/3 departamentos (sin
 *   preferencias de vivienda -- ese enfoque distinto queda para una
 *   iteración futura).
 * - "vivienda_propia": pide preferencias (tipo/dormitorios/baños/comuna) y
 *   elige UNA propiedad individual.
 * - "ambos": primero la propuesta de inversión (como "inversion"), y
 *   ENSEGUIDA (sin pasar por el dashboard) las preferencias + propiedad de
 *   vivienda propia. Solo tras aceptar AMBAS se muestra el cierre.
 */
export default function InitialProposalPage() {
  const router = useRouter()
  const [applicationId, setApplicationId] = React.useState<string | null>(null)
  const [notFound, setNotFound] = React.useState(false)
  const [step, setStep] = React.useState<Step>("initial-proposal")
  const [purpose, setPurpose] = React.useState<"inversion" | "vivienda_propia" | "ambos" | null>(null)
  const [destinations, setDestinations] = React.useState<
    ("vivir" | "airbnb" | "alquiler_tradicional" | "venta_corto_plazo")[]
  >([])

  React.useEffect(() => {
    let id: string | null = null
    try {
      const raw = window.sessionStorage.getItem(OUTPUT_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        id = parsed?.application?.id ?? null
      }
    } catch {
      // ignorar, cae al fallback de abajo
    }

    if (id) {
      setApplicationId(id)
      return
    }

    // Fallback: si el cliente llegó acá sin pasar por processing (ej. volvió
    // más tarde), buscamos su application real vía la sesión.
    fetch("/api/auth/user")
      .then((res) => (res.ok ? res.json() : null))
      .then(async (authData) => {
        const customerId = authData?.customer?.id
        if (!customerId) {
          setNotFound(true)
          return
        }
        const appsRes = await fetch(`/api/applications?customer_id=${customerId}&limit=1`)
        if (!appsRes.ok) {
          setNotFound(true)
          return
        }
        const { applications } = await appsRes.json()
        const app = applications?.[0]
        if (!app?.id) {
          setNotFound(true)
          return
        }
        if (app.stage !== "SCORING_COMPLETADO") {
          // Ya eligió (o la solicitud está en otro punto del flujo) -- no
          // tiene sentido mostrar esta pantalla, va directo al panel.
          router.push("/dashboard")
          return
        }
        setApplicationId(app.id)
      })
      .catch(() => setNotFound(true))
  }, [router])

  if (notFound) {
    return (
      <main className="bg-deep-ambient flex min-h-screen flex-col items-center justify-center px-6">
        <div className="glass-card flex max-w-md flex-col items-center gap-4 rounded-2xl p-8 text-center">
          <p className="text-sm text-text-secondary">
            No encontramos tu solicitud. Inicia sesión nuevamente para continuar.
          </p>
        </div>
      </main>
    )
  }

  if (!applicationId) {
    return (
      <main className="bg-deep-ambient flex min-h-screen flex-col items-center justify-center px-6">
        <p className="text-sm text-text-tertiary">Cargando tu simulación...</p>
      </main>
    )
  }

  if (step === "closing-avatar") {
    return (
      <AvatarPresenter
        heading="¡Felicitaciones!"
        script="¡Excelente! Lograste completar nuestro Wizard Inteligente. Ahora necesitamos que cargues tus documentos para poder agendar tu visita con el asesor asignado, y así puedas ver los proyectos que te presentamos."
        continueLabel="Ir a mi panel"
        onDone={() => router.push("/dashboard")}
      />
    )
  }

  const trackerIndex = step === "initial-proposal" ? 1 : 2

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#F5F3FF] px-4 py-12">
      {/* Decoración de fondo -- nubes suaves + degradé, igual a la referencia. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-24 -left-24 size-96 rounded-full bg-[#DBEAFE] opacity-60 blur-3xl" />
        <div className="absolute top-1/3 -right-32 size-96 rounded-full bg-[#E0E7FF] opacity-70 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 size-72 rounded-full bg-[#EDE9FE] opacity-50 blur-3xl" />
      </div>

      <div className="animate-fade-in-up relative w-full max-w-3xl">
        <header className="relative mb-8 flex flex-col items-center text-center">
          <Sparkles className="absolute -top-1 left-[16%] size-5 text-[#F59E0B]/70 sm:left-[20%]" aria-hidden="true" />
          <Sparkles className="absolute top-8 right-[14%] size-4 text-[#2563EB]/50 sm:right-[18%]" aria-hidden="true" />
          <span className="mb-4 flex size-[72px] items-center justify-center rounded-full bg-white shadow-[0_8px_24px_rgba(30,64,175,0.14)]">
            <span className="flex size-14 items-center justify-center rounded-full bg-[#DCFCE7]">
              <CheckCircle2 className="size-7 text-[#16A34A]" aria-hidden="true" />
            </span>
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#1E1B4B] sm:text-4xl">¡Vas muy bien!</h1>
          <p className="mt-2 max-w-md text-[15px] text-[#475569]">
            Tu pre-evaluación ya está lista. Estás más cerca de tu próxima propiedad.
          </p>
        </header>

        <StepTracker currentIndex={trackerIndex} />

        {step === "investment-proposal" && purpose ? (
          <PropertyPreferencesCard
            purpose={purpose}
            applicationId={applicationId}
            mode="investment"
            destinations={destinations.filter((d) => d !== "vivir")}
            onAccepted={() => {
              // Si además eligió "vivir", encadena directo a preferencias de
              // vivienda; si no, la propuesta de inversión ya terminó y va
              // al cierre.
              setStep(destinations.includes("vivir") ? "housing-preferences" : "closing-avatar")
            }}
          />
        ) : step === "housing-preferences" && purpose ? (
          <PropertyPreferencesCard
            purpose={purpose}
            applicationId={applicationId}
            mode="housing"
            onAccepted={() => setStep("closing-avatar")}
          />
        ) : (
          <InitialProposalCard
            applicationId={applicationId}
            onSelected={(selectedDestinations) => {
              const hasVivir = selectedDestinations.includes("vivir")
              const hasInvestment = selectedDestinations.some((d) => d !== "vivir")
              const normalized = hasVivir && hasInvestment ? "ambos" : hasInvestment ? "inversion" : "vivienda_propia"
              setPurpose(normalized)
              setDestinations(selectedDestinations)
              // "vivienda_propia" pura no pasa por la propuesta de inversión.
              setStep(hasInvestment ? "investment-proposal" : "housing-preferences")
            }}
          />
        )}
      </div>
    </main>
  )
}
