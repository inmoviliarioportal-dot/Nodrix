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
import { ScheduleVisitCard } from "@/components/dashboard/ScheduleVisitCard"
import { StageAlert } from "@/components/dashboard/StageAlert"
import { GuideVideoOverlay } from "@/components/dashboard/GuideVideoOverlay"
import { Clock } from "lucide-react"
import { STAGE_CLIENT_CONTENT } from "@/components/dashboard/stageContent"
import {
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
      <div className="flex flex-col gap-3.5">
        <div className="glass-card rounded-2xl p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-col gap-1">
              <span className="text-[10.5px] font-bold uppercase tracking-wide text-text-tertiary">
                Estado de tu proceso
              </span>
              <span className="text-xl font-bold tracking-tight text-text-primary">
                {application ? stageLabel : "Sin evaluación iniciada"}
              </span>
            </div>
            {scoring && isScoringCategory(scoring.category) && (
              <ScoringBadge category={scoring.category} />
            )}
          </div>

          {loading && <p className="mt-3 text-[12.5px] text-text-tertiary">Cargando tu solicitud...</p>}
          {error && <p className="mt-3 text-[12.5px] text-error">{error}</p>}

          {!loading && (
            <div className="mt-3">
              <Timeline
                orientation="horizontal"
                currentStage={application ? stage : ""}
                stages={CLIENT_TIMELINE_STAGES}
                labels={STAGE_MARKETING_LABELS}
              />
            </div>
          )}
        </div>

        {!loading && !application && (
          <div className="flex flex-col gap-2.5">
            <StageAlert
              tone="info"
              message="Aún no has comenzado tu evaluación. Completa el formulario de perfilamiento para ver tu solicitud avanzar por estas etapas."
            />

            <div className="glow-cyan flex flex-col items-start gap-2 rounded-xl border border-neon-cyan/40 bg-neon-cyan/[0.06] p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-0.5">
                <p className="text-[13px] font-bold text-text-primary">Comienza tu evaluación</p>
                <p className="text-[11.5px] text-text-secondary">
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

            <GuideVideoOverlay
              title={STAGE_CLIENT_CONTENT.RECEPCIONADA.videoTitle}
              videoUrl={STAGE_CLIENT_CONTENT.RECEPCIONADA.videoUrl}
              stageKey="RECEPCIONADA"
            />
          </div>
        )}

        {!loading && application && stage === "SCORING_COMPLETADO" && initialProposalQualifies === false && (
          // Cliente en análisis de perfil que NO califica: dejamos solo la
          // tarjeta ámbar, sin el resto de secciones de progreso.
          <div className="flex flex-col gap-2.5">
            <InitialProposalCard
              applicationId={application.id}
              onSelected={loadData}
              onQualificationChange={setInitialProposalQualifies}
            />
          </div>
        )}

        {!loading && application && !(stage === "SCORING_COMPLETADO" && initialProposalQualifies === false) && (
          <div className="flex flex-col gap-2.5">
            <StageAlert tone={stageContent.alert.tone} message={stageContent.alert.message} />

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[11px] text-text-tertiary">
                <Clock className="size-3.5 shrink-0" aria-hidden="true" />
                <span>Duración estimada: {stageContent.estimatedDuration}</span>
              </div>

              {(stage === "SCORING_COMPLETADO" || stage === "DOCUMENTOS_PENDIENTES") && (
                <Button
                  variant="outline"
                  size="sm"
                  render={<Link href="/onboarding/wizard?edit=true" />}
                >
                  Actualizar mis datos
                </Button>
              )}
            </div>

            {/* Un solo CTA prominente por etapa cuando aplica -- el resto de
                las acciones (agendar visita, actualizar datos) van como
                botones secundarios dentro de sus propias cards. */}
            {stageContent.showUploadCta && (
              <div className="glow-cyan flex flex-col items-start gap-2 rounded-xl border border-neon-cyan/40 bg-neon-cyan/[0.06] p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-0.5">
                  <p className="text-[13px] font-bold text-text-primary">
                    Tu solicitud necesita documentos
                  </p>
                  <p className="text-[11.5px] text-text-secondary">
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

            <GuideVideoOverlay title={stageContent.videoTitle} videoUrl={stageContent.videoUrl} stageKey={stage} />

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
                {/* Grid de KPI cards compactas: scoring, documentos, próximo
                    paso y (si corresponde) agendar visita -- hasta 3 por fila
                    en desktop para minimizar el scroll vertical. */}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  <ScoringCard scoring={scoring} />
                  <DocumentsCard documents={documents} onUploadClick={() => setUploadOpen(true)} />
                  <PreEvaluationCard
                    minUf={application?.pre_evaluation_min_uf}
                    maxUf={application?.pre_evaluation_max_uf}
                  />
                  <NextStepCard stage={stage} />
                  {/* Agendar visita en paralelo a la subida de documentos --
                      no hay que esperar a "Aprobado previo" para conocer
                      las propiedades que el cliente ya eligió. Tiene más
                      contenido (chips + formulario) -- ocupa el ancho completo. */}
                  {stage === "DOCUMENTOS_PENDIENTES" && application && (
                    <div className="sm:col-span-2 lg:col-span-3">
                      <ScheduleVisitCard applicationId={application.id} />
                    </div>
                  )}
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
