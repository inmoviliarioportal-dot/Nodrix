"use client"

import * as React from "react"
import { toast } from "sonner"

import { Layout } from "@/components/Layout"
import { Timeline } from "@/components/Timeline"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScoringBadge, type ScoringCategory } from "@/components/ui/scoring-badge"
import { Toaster } from "@/components/ui/sonner"

import { DocumentsCard } from "@/components/dashboard/DocumentsCard"
import { DocumentUploadModal } from "@/components/dashboard/DocumentUploadModal"
import { NextStepCard } from "@/components/dashboard/NextStepCard"
import { PreEvaluationCard } from "@/components/dashboard/PreEvaluationCard"
import { ScoringCard } from "@/components/dashboard/ScoringCard"
import {
  STAGE_LABELS,
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
        <Card className="border-gold/50">
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center justify-between gap-2">
              <span>Tu solicitud: {stageLabel}</span>
              {scoring && isScoringCategory(scoring.category) && (
                <ScoringBadge category={scoring.category} />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading && <p className="text-sm text-text-tertiary">Cargando tu solicitud...</p>}
            {error && <p className="text-sm text-status-error">{error}</p>}
            {!loading && !error && !application && (
              <p className="text-sm text-text-tertiary">
                Aún no tienes una solicitud registrada.
              </p>
            )}
          </CardContent>
        </Card>

        {!loading && application && (
          <Card>
            <CardContent>
              <Timeline currentStage={stage} />
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ScoringCard scoring={scoring} />
          <DocumentsCard documents={documents} onUploadClick={() => setUploadOpen(true)} />
          <PreEvaluationCard
            minUf={application?.pre_evaluation_min_uf}
            maxUf={application?.pre_evaluation_max_uf}
          />
          <NextStepCard stage={stage} />
        </div>
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
