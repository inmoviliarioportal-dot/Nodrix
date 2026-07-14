"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Toaster } from "@/components/ui/sonner"
import { DetailHeader } from "@/components/backoffice/DetailHeader"
import { StageTimeline } from "@/components/backoffice/StageTimeline"
import { DocumentsSection } from "@/components/backoffice/DocumentsSection"
import { PreEvaluationSection } from "@/components/backoffice/PreEvaluationSection"
import { NotesSection } from "@/components/backoffice/NotesSection"
import { StateTransition } from "@/components/backoffice/StateTransition"
import type { ApplicationRow, CustomerRow } from "@/lib/leads"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import type { DocumentRow, StageHistoryRow } from "@/components/backoffice/types"

export default function BackofficeApplicationDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const applicationId = params?.id

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [application, setApplication] = useState<ApplicationRow | null>(null)
  const [customer, setCustomer] = useState<CustomerRow | null>(null)
  const [stageHistory, setStageHistory] = useState<StageHistoryRow[]>([])
  const [documents, setDocuments] = useState<DocumentRow[]>([])
  const [actorUserId, setActorUserId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!applicationId) return
    setLoading(true)
    setError(null)
    try {
      const [detailRes, userRes] = await Promise.all([
        fetch(`/api/applications/${applicationId}`),
        fetch("/api/auth/user"),
      ])

      if (!detailRes.ok) throw new Error(`Error ${detailRes.status} al cargar la aplicación`)
      const detail = await detailRes.json()
      setApplication(detail.application ?? null)
      setCustomer(detail.customer ?? null)
      setStageHistory(detail.stageHistory ?? [])

      if (userRes.ok) {
        const userData = await userRes.json()
        setActorUserId(userData?.user?.id ?? null)
      }

      // No hay endpoint dedicado para "documentos de una aplicación" — se
      // consulta la tabla directamente con el cliente browser de Supabase
      // (RLS deshabilitado en el MVP, ver CLAUDE.md).
      const supabase = createSupabaseBrowserClient()
      const { data: docs } = await supabase
        .from("documents")
        .select("*")
        .eq("application_id", applicationId)
        .order("created_at", { ascending: false })
      setDocuments((docs as DocumentRow[]) ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido al cargar la aplicación.")
    } finally {
      setLoading(false)
    }
  }, [applicationId])

  useEffect(() => {
    loadData()
  }, [loadData])

  if (loading) {
    return (
      <div className="bg-deep-ambient min-h-screen px-4 py-8 sm:px-6 lg:px-10">
        <div className="glass-card mx-auto max-w-6xl rounded-xl p-8 text-center text-sm text-text-tertiary">
          Cargando aplicación...
        </div>
      </div>
    )
  }

  if (error || !application) {
    return (
      <div className="bg-deep-ambient min-h-screen px-4 py-8 sm:px-6 lg:px-10">
        <div className="glass-card mx-auto max-w-6xl rounded-xl border border-error/30 p-8 text-center text-sm text-error">
          {error ?? "Aplicación no encontrada."}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-deep-ambient min-h-screen px-4 py-8 sm:px-6 lg:px-10">
      <Toaster />
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <Button
          variant="ghost"
          size="sm"
          className="w-fit"
          onClick={() => router.push("/backoffice/queue")}
        >
          <ArrowLeft />
          Volver a la bandeja
        </Button>

        <DetailHeader application={application} customer={customer} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-6">
            <div className="glass-surface rounded-xl p-5">
              <h2 className="mb-4 font-heading text-sm font-semibold text-text-primary">
                Línea de tiempo
              </h2>
              <StageTimeline currentStage={application.stage} stageHistory={stageHistory} />
            </div>

            <StateTransition
              application={application}
              onUpdated={(updatedApp, updatedHistory) => {
                setApplication(updatedApp)
                if (updatedHistory.length) setStageHistory(updatedHistory)
              }}
            />
          </div>

          <div className="flex flex-col gap-6">
            <DocumentsSection documents={documents} onDocumentsChange={setDocuments} />

            <PreEvaluationSection application={application} onUpdated={setApplication} />

            <NotesSection
              applicationId={application.id}
              actorUserId={actorUserId}
              currentStage={application.stage}
              stageHistory={stageHistory}
              onHistoryChange={setStageHistory}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
