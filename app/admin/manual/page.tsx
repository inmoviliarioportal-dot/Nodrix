"use client"

import * as React from "react"
import { toast } from "sonner"
import { TriangleAlertIcon } from "lucide-react"

import { Layout } from "@/components/Layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Toaster } from "@/components/ui/sonner"

import {
  APPLICATION_STAGES,
  DOCUMENT_STATUSES,
  DOCUMENT_STATUS_LABELS,
  STAGE_LABELS,
  type ApplicationRecord,
  type DocumentRecord,
} from "@/components/dashboard/types"

interface RecentChange {
  id: string
  description: string
  timestamp: string
}

function selectClassName() {
  return "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
}

export default function AdminManualPage() {
  const [applications, setApplications] = React.useState<ApplicationRecord[]>([])
  const [loadingApps, setLoadingApps] = React.useState(true)

  const [selectedAppId, setSelectedAppId] = React.useState("")
  const [selectedStage, setSelectedStage] = React.useState<string>(APPLICATION_STAGES[0] as string)
  const [updatingStage, setUpdatingStage] = React.useState(false)

  const [documents, setDocuments] = React.useState<DocumentRecord[]>([])
  const [selectedDocId, setSelectedDocId] = React.useState("")
  const [selectedDocStatus, setSelectedDocStatus] = React.useState<string>(DOCUMENT_STATUSES[2])
  const [updatingDoc, setUpdatingDoc] = React.useState(false)

  const [recentChanges, setRecentChanges] = React.useState<RecentChange[]>([])

  const loadApplications = React.useCallback(async () => {
    setLoadingApps(true)
    try {
      const res = await fetch("/api/applications")
      if (!res.ok) throw new Error("No se pudo cargar la lista de solicitudes.")
      const data = await res.json()
      const list: ApplicationRecord[] = Array.isArray(data) ? data : (data.applications ?? [])
      setApplications(list)
      if (list.length && !selectedAppId) {
        setSelectedAppId(list[0].id)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al cargar solicitudes.")
    } finally {
      setLoadingApps(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  React.useEffect(() => {
    loadApplications()
  }, [loadApplications])

  // Al elegir una application, carga su detalle para poblar el selector de documentos.
  React.useEffect(() => {
    if (!selectedAppId) {
      setDocuments([])
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/applications/${selectedAppId}`)
        if (!res.ok) return
        const detail = await res.json()
        const app: ApplicationRecord = detail?.application ?? detail
        if (!cancelled) {
          setDocuments(app?.documents ?? [])
          setSelectedDocId(app?.documents?.[0]?.id ?? "")
        }
      } catch {
        // Silencioso: no bloquea el formulario de stage.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [selectedAppId])

  async function handleUpdateStage() {
    if (!selectedAppId) {
      toast.error("Selecciona una solicitud.")
      return
    }
    setUpdatingStage(true)
    try {
      const res = await fetch(`/api/applications/${selectedAppId}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: selectedStage }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error ?? `Error ${res.status} al actualizar el estado.`)
      }
      toast.success("Estado de la solicitud actualizado.")
      setRecentChanges((prev) => [
        {
          id: `${Date.now()}`,
          description: `Solicitud ${selectedAppId} → ${STAGE_LABELS[selectedStage] ?? selectedStage}`,
          timestamp: new Date().toLocaleString("es-CL"),
        },
        ...prev,
      ])
      loadApplications()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo actualizar el estado.")
    } finally {
      setUpdatingStage(false)
    }
  }

  async function handleUpdateDocument() {
    if (!selectedDocId) {
      toast.error("Selecciona un documento.")
      return
    }
    setUpdatingDoc(true)
    try {
      const res = await fetch(`/api/documents/${selectedDocId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: selectedDocStatus }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error ?? `Error ${res.status} al actualizar el documento.`)
      }
      toast.success("Estado del documento actualizado.")
      setRecentChanges((prev) => [
        {
          id: `${Date.now()}`,
          description: `Documento ${selectedDocId} → ${DOCUMENT_STATUS_LABELS[selectedDocStatus] ?? selectedDocStatus}`,
          timestamp: new Date().toLocaleString("es-CL"),
        },
        ...prev,
      ])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo actualizar el documento.")
    } finally {
      setUpdatingDoc(false)
    }
  }

  return (
    <Layout navLinks={[{ href: "/admin/dashboard", label: "KPIs" }, { href: "/admin/reports", label: "Reportes" }]}>
      <Toaster />
      <div className="flex flex-col gap-6">
        <div className="flex items-start gap-3 rounded-lg border border-status-warning/40 bg-status-warning/10 px-4 py-3">
          <TriangleAlertIcon className="mt-0.5 size-5 shrink-0 text-status-warning" />
          <p className="text-sm text-text-secondary">
            <span className="font-semibold text-status-warning">Operación Manual (Release 1)</span>
            {" "}— esta página permite cambiar estados de solicitudes y documentos directamente,
            sin necesidad de tocar Supabase. Se automatiza y se restringe por rol en Release 2.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Actualizar estado de solicitud</CardTitle>
            <CardDescription>
              Selecciona una solicitud y su nuevo estado dentro del flujo.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="application-select">Solicitud</Label>
              <select
                id="application-select"
                className={selectClassName()}
                value={selectedAppId}
                onChange={(e) => setSelectedAppId(e.target.value)}
                disabled={loadingApps || applications.length === 0}
              >
                {applications.length === 0 && <option value="">Sin solicitudes disponibles</option>}
                {applications.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.id} — {STAGE_LABELS[app.stage] ?? app.stage}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="stage-select">Nuevo estado</Label>
              <select
                id="stage-select"
                className={selectClassName()}
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value)}
              >
                {APPLICATION_STAGES.map((stage) => (
                  <option key={stage} value={stage}>
                    {STAGE_LABELS[stage] ?? stage}
                  </option>
                ))}
              </select>
            </div>

            <Button
              onClick={handleUpdateStage}
              disabled={updatingStage || !selectedAppId}
              className="w-fit"
            >
              {updatingStage ? "Actualizando..." : "Actualizar Estado"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actualizar estado de documento</CardTitle>
            <CardDescription>
              Documentos de la solicitud seleccionada arriba.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="document-select">Documento</Label>
              <select
                id="document-select"
                className={selectClassName()}
                value={selectedDocId}
                onChange={(e) => setSelectedDocId(e.target.value)}
                disabled={documents.length === 0}
              >
                {documents.length === 0 && <option value="">Sin documentos disponibles</option>}
                {documents.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.type} — {DOCUMENT_STATUS_LABELS[doc.status] ?? doc.status}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="document-status-select">Nuevo estado</Label>
              <select
                id="document-status-select"
                className={selectClassName()}
                value={selectedDocStatus}
                onChange={(e) => setSelectedDocStatus(e.target.value)}
              >
                {DOCUMENT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {DOCUMENT_STATUS_LABELS[status] ?? status}
                  </option>
                ))}
              </select>
            </div>

            <Button
              onClick={handleUpdateDocument}
              disabled={updatingDoc || !selectedDocId}
              className="w-fit"
            >
              {updatingDoc ? "Actualizando..." : "Actualizar Documento"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cambios recientes</CardTitle>
          </CardHeader>
          <CardContent>
            {recentChanges.length === 0 ? (
              <p className="text-sm text-text-tertiary">Sin cambios en esta sesión.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {recentChanges.map((change) => (
                  <li key={change.id} className="text-sm text-text-secondary">
                    <span className="text-text-tertiary">{change.timestamp}</span> — {change.description}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
