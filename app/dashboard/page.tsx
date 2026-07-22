"use client"

import * as React from "react"
import Link from "next/link"
import { toast } from "sonner"
import { ArrowRight } from "lucide-react"

import { Layout } from "@/components/Layout"
import { Timeline } from "@/components/Timeline"
import { ScoringBadge, type ScoringCategory } from "@/components/ui/scoring-badge"
import { Toaster } from "@/components/ui/sonner"

import { ComunaOffersCard } from "@/components/dashboard/ComunaOffersCard"
import { WhatsAppBubble } from "@/components/dashboard/WhatsAppBubble"
import { DocumentsCard } from "@/components/dashboard/DocumentsCard"
import { DocumentUploadModal } from "@/components/dashboard/DocumentUploadModal"
import { FinalProposalCard } from "@/components/dashboard/FinalProposalCard"
import { InitialProposalCard } from "@/components/dashboard/InitialProposalCard"
import { InitialProposalReminder } from "@/components/dashboard/InitialProposalReminder"
import { NextStepCard } from "@/components/dashboard/NextStepCard"
import { PreEvaluationCard } from "@/components/dashboard/PreEvaluationCard"
import { ScoringCard } from "@/components/dashboard/ScoringCard"
import { StageAlert } from "@/components/dashboard/StageAlert"
import { HookVideo } from "@/components/dashboard/HookVideo"
import { StageProgressBar } from "@/components/dashboard/StageProgressBar"
import { Clock } from "lucide-react"
import { STAGE_CLIENT_CONTENT } from "@/components/dashboard/stageContent"
import {
  APPLICATION_STAGES,
  CLIENT_TIMELINE_STAGES,
  STAGE_LABELS,
  STAGE_MARKETING_LABELS,
  type ApplicationStage,
  type ApplicationRecord,
  type AuthUserResponse,
} from "@/components/dashboard/types"
import { Button } from "@/components/ui/button"
import { UploadCloud } from "lucide-react"

function isScoringCategory(value: unknown): value is ScoringCategory {
  return value === "BRONCE" || value === "PLATA" || value === "ORO" || value === "PLATINO" || value === "BLACK"
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
  // Solo relevante en stage SCORING_COMPLETADO: si el cliente no califica
  // (UF estimadas < MIN_QUALIFYING_UF), ocultamos el timeline y demás
  // secciones de progreso, dejando únicamente la tarjeta ámbar de
  // InitialProposalCard + el botón de actualizar datos.
  const [initialProposalQualifies, setInitialProposalQualifies] = React.useState<boolean | null>(null)

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

  React.useEffect(() => {
    if (application?.stage !== "SCORING_COMPLETADO") setInitialProposalQualifies(null)
  }, [application?.stage])

  const stage = application?.stage ?? "RECEPCIONADA"
  const stageLabel = STAGE_LABELS[stage] ?? stage
  const stageContent =
    STAGE_CLIENT_CONTENT[stage as ApplicationStage] ?? STAGE_CLIENT_CONTENT.RECEPCIONADA
  const currentStageIndex = application ? APPLICATION_STAGES.indexOf(stage as ApplicationStage) : -1
  const completedSteps = currentStageIndex >= 0 ? currentStageIndex : 0
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

          {!loading && (
            <div className="mt-4">
              <StageProgressBar completedSteps={completedSteps} totalSteps={APPLICATION_STAGES.length} />
            </div>
          )}

          {loading && (
            <p className="mt-4 text-sm text-text-tertiary">Cargando tu solicitud...</p>
          )}
          {error && <p className="mt-4 text-sm text-error">{error}</p>}
        </div>

        {!loading && !application && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,360px)_1fr]">
            <div className="glass-card rounded-2xl p-6">
              <h2 className="mb-6 text-sm font-semibold uppercase tracking-wide text-text-tertiary">
                Tu recorrido
              </h2>
              <Timeline
                orientation="vertical"
                currentStage=""
                stages={CLIENT_TIMELINE_STAGES}
                labels={STAGE_MARKETING_LABELS}
              />
            </div>

            <div className="flex flex-col gap-4">
              <StageAlert
                tone="info"
                message="Aún no has comenzado tu evaluación. Completa el formulario de perfilamiento para ver tu solicitud avanzar por estas etapas."
              />

              <div className="glass-card glow-cyan flex flex-col items-start gap-3 rounded-2xl border border-neon-cyan/40 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold text-text-primary">Comienza tu evaluación</p>
                  <p className="text-xs text-text-secondary">
                    Responde algunas preguntas y descubre tu categoría de inversión al instante.
                  </p>
                </div>
                <Button
                  className="glow-cyan gap-2 bg-neon-cyan text-deep hover:bg-neon-cyan/90"
                  render={<Link href="/onboarding/wizard" />}
                >
                  Empezar ahora
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
              </div>

              <HookVideo
                title={STAGE_CLIENT_CONTENT.RECEPCIONADA.videoTitle}
                videoUrl={STAGE_CLIENT_CONTENT.RECEPCIONADA.videoUrl}
              />
            </div>
          </div>
        )}

        {!loading && application && stage === "SCORING_COMPLETADO" && initialProposalQualifies === false && (
          // Cliente en análisis de perfil que NO califica: ocultamos timeline
          // y demás secciones de progreso, dejando solo la tarjeta ámbar.
          <div className="flex flex-col gap-4">
            <InitialProposalCard
              applicationId={application.id}
              onSelected={loadData}
              onQualificationChange={setInitialProposalQualifies}
            />
          </div>
        )}

        {!loading && application && !(stage === "SCORING_COMPLETADO" && initialProposalQualifies === false) && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,360px)_1fr]">
            <div className="glass-card rounded-2xl p-6">
              <h2 className="mb-6 text-sm font-semibold uppercase tracking-wide text-text-tertiary">
                Línea de tiempo
              </h2>
              <Timeline
                orientation="vertical"
                currentStage={stage}
                stages={CLIENT_TIMELINE_STAGES}
                labels={STAGE_MARKETING_LABELS}
              />
            </div>

            <div className="flex flex-col gap-4">
              <StageAlert tone={stageContent.alert.tone} message={stageContent.alert.message} />

              <div className="flex items-center gap-2 text-xs text-text-tertiary">
                <Clock className="size-3.5 shrink-0" aria-hidden="true" />
                <span>Duración estimada de esta etapa: {stageContent.estimatedDuration}</span>
              </div>

              {(stage === "SCORING_COMPLETADO" || stage === "DOCUMENTOS_PENDIENTES") && (
                <Button
                  variant="outline"
                  className="w-fit"
                  render={<Link href="/onboarding/wizard?edit=true" />}
                >
                  Actualizar mis datos
                </Button>
              )}

              {stageContent.showUploadCta && (
                <div className="glass-card glow-cyan flex flex-col items-start gap-3 rounded-2xl border border-neon-cyan/40 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-semibold text-text-primary">
                      Tu solicitud necesita documentos
                    </p>
                    <p className="text-xs text-text-secondary">
                      Súbelos ahora para que tu asesor pueda continuar el proceso.
                    </p>
                  </div>
                  <Button
                    className="glow-cyan gap-2 bg-neon-cyan text-deep hover:bg-neon-cyan/90"
                    onClick={() => setUploadOpen(true)}
                  >
                    <UploadCloud className="size-4" aria-hidden="true" />
                    Subir documentos
                  </Button>
                </div>
              )}

              <HookVideo title={stageContent.videoTitle} videoUrl={stageContent.videoUrl} />

              {stage === "SCORING_COMPLETADO" && application ? (
                // Antes de subir documentos, el cliente debe elegir su
                // propuesta inicial (simulación de riesgo) -- no tiene
                // sentido mostrarle la tarjeta de documentos todavía.
                <InitialProposalCard
                  applicationId={application.id}
                  onSelected={loadData}
                  onQualificationChange={setInitialProposalQualifies}
                />
              ) : (
                <>
                  {application?.initial_proposal_band && application?.initial_proposal_purpose && (
                    <InitialProposalReminder
                      band={application.initial_proposal_band}
                      purpose={application.initial_proposal_purpose}
                    />
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
                </>
              )}
              {stage === "PRE_EVALUACION_COMPLETADA" && application && (
                <ComunaOffersCard applicationId={application.id} />
              )}
              {["ENVIADO_A_BANCO", "ESCRITURACION_AGENDADA", "CIERRE"].includes(stage) && application && (
                <FinalProposalCard applicationId={application.id} />
              )}
            </div>
          </div>
        )}
      </div>

      <WhatsAppBubble />

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
