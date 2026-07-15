"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { InitialProposalCard } from "@/components/dashboard/InitialProposalCard"

const OUTPUT_KEY = "onboarding-result"

/**
 * Paso del onboarding INMEDIATAMENTE después de que la pantalla de
 * procesamiento (AI Processing) llega a 100%: el cliente elige su propuesta
 * inicial (simulación de riesgo por tramo de departamentos) ANTES de pasar
 * a su panel. Reutiliza el mismo `InitialProposalCard` que se muestra como
 * fallback en el dashboard (si el cliente sale de acá sin elegir y vuelve
 * después, lo ve ahí igual).
 */
export default function InitialProposalPage() {
  const router = useRouter()
  const [applicationId, setApplicationId] = React.useState<string | null>(null)
  const [notFound, setNotFound] = React.useState(false)

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

  return (
    <main className="bg-deep-ambient flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-3xl">
        <header className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-text-primary">¡Tu análisis está listo!</h1>
          <p className="mt-2 text-sm text-text-tertiary">
            Antes de subir tus documentos, elige tu propuesta inicial.
          </p>
        </header>
        <InitialProposalCard applicationId={applicationId} onSelected={() => router.push("/dashboard")} />
      </div>
    </main>
  )
}
