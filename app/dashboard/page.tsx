"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { Layout } from "@/components/Layout"
import { Timeline } from "@/components/Timeline"
import { type ScoringCategory } from "@/components/ui/scoring-badge"
import { Toaster } from "@/components/ui/sonner"

import { ComunaOffersCard } from "@/components/dashboard/ComunaOffersCard"
import { WhatsAppBubble } from "@/components/dashboard/WhatsAppBubble"
import { FinalProposalCard } from "@/components/dashboard/FinalProposalCard"
import { InitialProposalCard } from "@/components/dashboard/InitialProposalCard"
import { PreEvaluationCard } from "@/components/dashboard/PreEvaluationCard"
import { ScheduleVisitCard } from "@/components/dashboard/ScheduleVisitCard"
import { StageAlert } from "@/components/dashboard/StageAlert"
import { GuideVideoOverlay } from "@/components/dashboard/GuideVideoOverlay"
import { Clock } from "lucide-react"
import { STAGE_CLIENT_CONTENT } from "@/components/dashboard/stageContent"
import {
  CLIENT_TIMELINE_STAGES,
  STAGE_LABELS,
  STAGE_MARKETING_LABELS,
  mapStageForClientTimeline,
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
        <div className="animate-fade-in-up overflow-hidden rounded-2xl bg-[#101B3D]">
          <div className="grid grid-cols-1 sm:grid-cols-[1.3fr_1fr]">
            <div className="flex flex-col justify-center gap-4 p-5 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10.5px] font-bold uppercase tracking-wide text-gold">
                    Estado de tu proceso
                  </span>
                  <span className="font-heading text-xl font-semibold text-white sm:text-2xl">
                    {application ? stageLabel : "Sin evaluación iniciada"}
                  </span>
                </div>
                {scoring && isScoringCategory(scoring.category) && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold text-white">
                    {scoring.category}
                    <span aria-hidden="true">★</span>
                  </span>
                )}
              </div>

              {loading && <p className="text-[12.5px] text-white/70">Cargando tu solicitud...</p>}
              {error && <p className="text-[12.5px] text-status-error">{error}</p>}

              {!loading && application && (
                <div className="flex flex-col gap-2">
                  {(() => {
                    const idx = CLIENT_TIMELINE_STAGES.indexOf(mapStageForClientTimeline(stage as ApplicationStage))
                    const completed = idx >= 0 ? idx : 0
                    const total = CLIENT_TIMELINE_STAGES.length
                    const pct = total > 0 ? Math.round((completed / total) * 100) : 0
                    return (
                      <>
                        <div className="flex items-center justify-between text-[12px] text-white/70">
                          <span>
                            {completed} de {total} pasos completados
                          </span>
                          <span className="font-semibold text-white">{pct}%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-white/15">
                          <div
                            className="h-full rounded-full bg-gold transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </>
                    )
                  })()}
                </div>
              )}
            </div>
            <div
              className="hidden min-h-[150px] rounded-2xl bg-cover bg-center sm:m-3 sm:block"
              style={{
                backgroundImage:
                  "url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80')",
              }}
              role="img"
              aria-label="Foto de la propiedad de interés"
            />
          </div>
        </div>

        {!loading && (
          <div
            className="glass-card animate-fade-in-up rounded-2xl p-3.5"
            style={{ "--animate-delay": "80ms" } as React.CSSProperties}
          >
            <h2 className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-text-tertiary">
              Línea de tiempo
            </h2>
            <Timeline
              orientation="horizontal"
              currentStage={application ? mapStageForClientTimeline(stage as ApplicationStage) : ""}
              stages={CLIENT_TIMELINE_STAGES}
              labels={STAGE_MARKETING_LABELS}
            />
          </div>
        )}

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
                className="glow-cyan gap-2 rounded-full bg-neon-cyan text-white hover:bg-neon-cyan/90"
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

            <div className="flex items-center gap-1.5 text-[11px] text-text-tertiary">
              <Clock className="size-3.5 shrink-0" aria-hidden="true" />
              <span>Duración estimada: {stageContent.estimatedDuration}</span>
            </div>

            {/* Fila de acciones -- los 3 botones (subir documentos, actualizar
                datos, video guía) uno al lado del otro, misma tipografía y
                tamaño para que se vean como un solo grupo coherente. */}
            <div className="flex flex-wrap items-center gap-2">
              {stageContent.showUploadCta && (
                <Button
                  className="glow-cyan gap-2 rounded-full bg-neon-cyan px-5 py-2.5 text-[13.5px] font-semibold text-white hover:bg-neon-cyan/90"
                  render={<Link href="/dashboard/documents" />}
                >
                  <UploadCloud className="size-4" aria-hidden="true" />
                  Subir documentos
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
              )}
              {(stage === "SCORING_COMPLETADO" || stage === "DOCUMENTOS_PENDIENTES") && (
                <Button
                  className="gap-2 rounded-full border border-neon-cyan/40 bg-neon-cyan/[0.06] px-5 py-2.5 text-[13.5px] font-semibold text-neon-cyan hover:bg-neon-cyan/10"
                  variant="outline"
                  render={<Link href="/onboarding/wizard?edit=true" />}
                >
                  Actualizar mis datos
                </Button>
              )}
              <GuideVideoOverlay title={stageContent.videoTitle} videoUrl={stageContent.videoUrl} stageKey={stage} />
            </div>

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
              // Ya no se muestra el recordatorio de "propuesta inicial
              // simulada" -- redundante con PreEvaluationCard, que ahora
              // indica las UF aprobadas y el detalle real de propiedades
              // elegidas (ver components/dashboard/PreEvaluationCard.tsx).
              // Tampoco se repite la tarjeta "Documentos" -- redundante con
              // el CTA "Subir documentos" ya destacado arriba.
              <div className="flex flex-col gap-2">
                <div className="animate-fade-in-up" style={{ "--animate-delay": "0ms" } as React.CSSProperties}>
                  <PreEvaluationCard applicationId={application.id} />
                </div>
                {/* Agendar visita en paralelo a la subida de documentos --
                    no hay que esperar a "Aprobado previo" para conocer
                    las propiedades que el cliente ya eligió. */}
                {stage === "DOCUMENTOS_PENDIENTES" && application && (
                  <div className="animate-fade-in-up" style={{ "--animate-delay": "80ms" } as React.CSSProperties}>
                    <ScheduleVisitCard applicationId={application.id} />
                  </div>
                )}
              </div>
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
    </Layout>
  )
}
