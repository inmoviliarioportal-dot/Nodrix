"use client"

import * as React from "react"
import { toast } from "sonner"

import { Layout } from "@/components/Layout"
import { Timeline } from "@/components/Timeline"
import { ScoringBadge, type ScoringCategory } from "@/components/ui/scoring-badge"
import { Toaster } from "@/components/ui/sonner"

import { AdvisorCard } from "@/components/dashboard/AdvisorCard"
import { DocumentsCard } from "@/components/dashboard/DocumentsCard"
import { DocumentUploadModal } from "@/components/dashboard/DocumentUploadModal"
import { NextStepCard } from "@/components/dashboard/NextStepCard"
import { PreEvaluationCard } from "@/components/dashboard/PreEvaluationCard"
import { ScoringCard } from "@/components/dashboard/ScoringCard"
import {
  APPLICATION_STAGES,
  STAGE_LABELS,
  STAGE_MARKETING_LABELS,
  type ApplicationRecord,
  type AuthUserResponse,
} from "@/components/dashboard/types"

function isScoringCategory(value: unknown): value is ScoringCategory {
  return value === "BRONCE" || value === "PLATA" || value === "ORO" || value === "PLATINO"
}

/** Extrae la application "actual" del usuario desde las distintas formas posibles
 * de la respuesta de `GET /api/auth/user` (el contrato exacto lo definen otros
 * agentes en paralelo; toleramos varias formas mientras se estabiliza). */
function pickApplication(authData: AuthUserResponse | null): ApplicationRecord | null {
  if (!authData) return null
  if (authData.application) return authData.application
  if (authData.applications?.length) return authData.applications[0]
  return null
}

export default function DashboardPage() {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [application, setApplication] = React.useState<ApplicationRecord | null>(null)
  const [uploadOpen, setUploadOpen] = React.useState(false)

  const loadData = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const userRes = await fetch("/api/auth/user")
      if (!userRes.ok) {
        throw new Error("No se pudo obtener el usuario autenticado.")
      }
      const authData: AuthUserResponse = await userRes.json()
      let app = pickApplication(authData)

      // GET /api/auth/user solo retorna { user, customer } (no incluye la
      // application embebida) — la fuente real de verdad es
      // GET /api/applications?customer_id=... construido por el agente
      // Leads+Applications. Se toma la más reciente (el endpoint ya ordena
      // por created_at desc).
      if (!app && authData.customer?.id) {
        const appsRes = await fetch(`/api/applications?customer_id=${authData.customer.id}&limit=1`)
        if (appsRes.ok) {
          const { applications } = await appsRes.json()
          app = applications?.[0] ?? null
        }
      }

      if (app?.id) {
        // Refrescar el detalle completo (documentos, scoring) por si el
        // endpoint de auth solo trae un resumen.
        const appRes = await fetch(`/api/applications/${app.id}`)
        if (appRes.ok) {
          const detail = await appRes.json()
          app = detail?.application ?? detail ?? app
        }
      }

      setApplication(app)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar tu solicitud.")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  const stage = application?.stage ?? "RECEPCIONADA"
  const stageLabel = STAGE_LABELS[stage] ?? stage
  const documents = application?.documents ?? []
  const scoring =
    application?.scoring ??
    (application?.scoring_category && isScoringCategory(application.scoring_category)
      ? {
          score: application.scoring_score ?? 0,
          category: application.scoring_category,
          explanation: "Pendiente de evaluación.",
        }
      : null)

  return (
    <Layout>
      <Toaster />
      <div className="flex flex-col gap-6">
        <div className="glass-card rounded-2xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
                Estado de mi proceso
              </span>
              <span className="text-2xl font-semibold text-text-primary">
                {stageLabel}
              </span>
            </div>
            {scoring && isScoringCategory(scoring.category) && (
              <ScoringBadge category={scoring.category} />
            )}
          </div>
          {loading && (
            <p className="mt-4 text-sm text-text-tertiary">Cargando tu solicitud...</p>
          )}
          {error && <p className="mt-4 text-sm text-status-error">{error}</p>}
          {!loading && !error && !application && (
            <p className="mt-4 text-sm text-text-tertiary">
              Aún no tienes una solicitud registrada.
            </p>
          )}
        </div>

        {!loading && application && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,360px)_1fr]">
            <div className="glass-card rounded-2xl p-6">
              <h2 className="mb-6 text-sm font-semibold uppercase tracking-wide text-text-tertiary">
                Timeline de tu solicitud
              </h2>
              <Timeline
                currentStage={stage}
                stages={[...APPLICATION_STAGES]}
                labels={STAGE_MARKETING_LABELS}
              />
            </div>

            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <ScoringCard scoring={scoring} />
                <DocumentsCard documents={documents} onUploadClick={() => setUploadOpen(true)} />
                <PreEvaluationCard
                  minUf={application?.pre_evaluation_min_uf}
                  maxUf={application?.pre_evaluation_max_uf}
                />
                <NextStepCard stage={stage} />
              </div>
              <AdvisorCard />
            </div>
          </div>
        )}
      </div>

      {application && (
        <DocumentUploadModal
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          applicationId={application.id}
          onUploaded={() => {
            toast.success("Documento subido correctamente.")
            loadData()
          }}
        />
      )}
    </Layout>
  )
}
