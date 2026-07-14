"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { ComboCard } from "@/components/proposal/ComboCard"
import { RetentionModal } from "@/components/proposal/RetentionModal"
import { useExitIntent } from "@/components/proposal/useExitIntent"
import { fetchProposalProperties, readOnboardingResult } from "@/components/proposal/data"
import type { ProposalProperty } from "@/components/proposal/types"

/**
 * Fase 4 — Presentación de la Propuesta ("Wow Effect").
 *
 * El cliente ve el valor financiero de la propuesta (Cap Rate, Plusvalía,
 * Flujo Mensual) ANTES de que se le pida subir un solo documento.
 *
 * Fuente de datos de propiedades: intenta `GET /api/properties`; si no existe
 * o no trae métricas de inversión, cae a datos mock locales (ver
 * components/proposal/data.ts) — documentado ahí mismo.
 *
 * Resultado de scoring: se lee (tolerante) desde sessionStorage bajo la clave
 * `onboarding-result` (ver ONBOARDING_RESULT_KEY), escrita por el Agente AI
 * Processing en paralelo. Si no está disponible, la pantalla igual funciona
 * mostrando el combo genérico.
 */
export default function ProposalPage() {
  const router = useRouter()
  const [properties, setProperties] = useState<ProposalProperty[] | null>(null)
  const [scoringCategory, setScoringCategory] = useState<string | null>(null)
  const { showRetentionModal, dismiss } = useExitIntent()

  useEffect(() => {
    let cancelled = false
    fetchProposalProperties().then(({ properties }) => {
      if (!cancelled) setProperties(properties)
    })

    const result = readOnboardingResult()
    if (result?.category) setScoringCategory(String(result.category))

    return () => {
      cancelled = true
    }
  }, [])

  const handleSelect = () => {
    router.push("/dashboard/documents")
  }

  return (
    <main className="bg-deep-ambient flex min-h-screen flex-col items-center justify-center px-4 py-16">
      {scoringCategory && (
        <p className="mb-6 text-center text-xs uppercase tracking-widest text-text-tertiary">
          Categoría de scoring: <span className="text-text-secondary">{scoringCategory}</span>
        </p>
      )}

      {properties ? (
        <ComboCard properties={properties} onSelect={handleSelect} />
      ) : (
        <div className="flex flex-col items-center gap-3 text-text-secondary">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-sm">Preparando tu propuesta...</span>
        </div>
      )}

      <RetentionModal open={showRetentionModal} onDismiss={dismiss} onStay={dismiss} />
    </main>
  )
}
