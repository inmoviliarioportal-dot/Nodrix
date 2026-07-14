"use client"

import * as React from "react"

import { Layout } from "@/components/Layout"
import { Toaster } from "@/components/ui/sonner"
import { DocumentVaultItem } from "@/components/vault/DocumentVaultItem"
import {
  DOCUMENT_TYPES,
  type ApplicationRecord,
  type AuthUserResponse,
  type DocumentRecord,
} from "@/components/dashboard/types"

/** Extrae la application "actual" del usuario desde las distintas formas posibles
 * de la respuesta de `GET /api/auth/user` (contrato definido en paralelo por
 * otros agentes; toleramos varias formas mientras se estabiliza). Misma
 * lógica usada en `app/dashboard/page.tsx`. */
function pickApplication(authData: AuthUserResponse | null): ApplicationRecord | null {
  if (!authData) return null
  if (authData.application) return authData.application
  if (authData.applications?.length) return authData.applications[0]
  return null
}

export default function DashboardDocumentsPage() {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [application, setApplication] = React.useState<ApplicationRecord | null>(null)

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

      if (!app && authData.customer?.id) {
        const appsRes = await fetch(`/api/applications?customer_id=${authData.customer.id}&limit=1`)
        if (appsRes.ok) {
          const { applications } = await appsRes.json()
          app = applications?.[0] ?? null
        }
      }

      if (app?.id) {
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

  const documents = application?.documents ?? []

  /** Último documento subido para cada tipo requerido (por si hay historial de reemplazos). */
  function documentForType(typeValue: string): DocumentRecord | undefined {
    const matches = documents.filter((doc) => doc.type === typeValue)
    if (matches.length === 0) return undefined
    return matches.reduce((latest, current) => {
      const latestDate = latest.created_at ? new Date(latest.created_at).getTime() : 0
      const currentDate = current.created_at ? new Date(current.created_at).getTime() : 0
      return currentDate >= latestDate ? current : latest
    })
  }

  const approvedCount = DOCUMENT_TYPES.filter(
    (docType) => documentForType(docType.value)?.status === "aprobado"
  ).length
  const totalCount = DOCUMENT_TYPES.length
  const progressPct = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0

  return (
    <Layout>
      <Toaster />
      <div className="flex flex-col gap-6">
        <div className="glass-surface flex flex-col gap-3 rounded-xl p-6">
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
            Bóveda Documental
          </h1>
          <p className="text-sm text-text-secondary">
            Sube los documentos requeridos para avanzar en tu solicitud. Cada archivo se
            revisa individualmente por tu asesor.
          </p>

          {!loading && application && (
            <div className="mt-2 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs text-text-tertiary">
                <span>
                  {approvedCount}/{totalCount} documentos aprobados
                </span>
                <span className="tabular-nums">{progressPct}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface-elevated">
                <div
                  className="h-full rounded-full bg-neon-green transition-[width] duration-300 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {loading && (
          <p className="text-sm text-text-tertiary">Cargando tu bóveda documental...</p>
        )}
        {error && <p className="text-sm text-status-error">{error}</p>}
        {!loading && !error && !application && (
          <p className="text-sm text-text-tertiary">
            Aún no tienes una solicitud registrada. Vuelve al dashboard para comenzar.
          </p>
        )}

        {!loading && application && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {DOCUMENT_TYPES.map((docType) => (
              <DocumentVaultItem
                key={docType.value}
                typeValue={docType.value}
                typeLabel={docType.label}
                applicationId={application.id}
                document={documentForType(docType.value)}
                onUploaded={loadData}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
