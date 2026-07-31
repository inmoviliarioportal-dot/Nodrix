"use client"

import * as React from "react"
import { FolderLock, Lightbulb, ShieldCheck, Lock, Cloud, FileText } from "lucide-react"

import { Layout } from "@/components/Layout"
import { Button } from "@/components/ui/button"
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
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <div className="glass-surface animate-fade-in-up flex flex-col gap-4 rounded-2xl p-6 sm:p-7">
          <div className="flex items-start gap-3">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-neon-cyan/10 text-neon-cyan">
              <FolderLock className="size-6" aria-hidden="true" />
            </span>
            <div>
              <h1 className="font-heading text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl">
                Bóveda documental
              </h1>
              <p className="mt-1 text-[13.5px] text-text-secondary">
                Sube los documentos requeridos para avanzar en tu solicitud. Cada archivo se
                revisa individualmente por tu asesor.
              </p>
            </div>
          </div>

          {!loading && application && (
            <div className="flex flex-col gap-1.5 rounded-xl border border-glass-border p-3.5">
              <div className="flex items-center justify-between text-[13px] text-text-secondary">
                <span>
                  <span className="font-heading font-semibold text-neon-cyan">
                    {approvedCount}/{totalCount}
                  </span>{" "}
                  documentos aprobados
                </span>
                <span className="font-heading tabular-nums font-semibold text-neon-cyan">{progressPct}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-elevated">
                <div
                  className="h-full rounded-full bg-neon-cyan transition-[width] duration-300 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}

          <div className="glass-card flex flex-col items-start gap-2.5 rounded-xl border-l-4 border-l-gold bg-dark-tertiary p-3.5 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-2 text-[12.5px] leading-snug text-text-secondary">
              <Lightbulb className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden="true" />
              Si no tienes claro qué documento corresponde, puedes ver la guía rápida antes de subirlo.
            </p>
            <Button variant="outline" size="sm" className="w-fit shrink-0 gap-1.5 rounded-full">
              <FileText className="size-3.5" aria-hidden="true" />
              Ver guía de documentos
            </Button>
          </div>
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
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.6fr_1fr]">
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              {DOCUMENT_TYPES.map((docType, idx) => (
                <div
                  key={docType.value}
                  className="animate-fade-in-up"
                  style={{ "--animate-delay": `${idx * 60}ms` } as React.CSSProperties}
                >
                  <DocumentVaultItem
                    typeValue={docType.value}
                    typeLabel={docType.label}
                    applicationId={application.id}
                    document={documentForType(docType.value)}
                    onUploaded={loadData}
                  />
                </div>
              ))}
            </div>

            {/* Panel lateral de seguridad -- puramente informativo, sin lógica de datos. */}
            <aside className="glow-purple flex flex-col gap-4 rounded-2xl bg-dark-tertiary p-5">
              <span className="flex size-14 items-center justify-center self-start rounded-full bg-neon-purple/15 text-neon-purple">
                <ShieldCheck className="size-6" aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-heading text-[16px] font-semibold text-text-primary">
                  Tus documentos se almacenan de forma segura
                </h2>
                <p className="mt-1 text-[12.5px] leading-relaxed text-text-secondary">
                  Utilizamos cifrado y altos estándares de seguridad para proteger tu información en todo momento.
                </p>
              </div>
              <ul className="flex flex-col gap-3">
                <li className="flex items-start gap-2.5 text-[12.5px] text-text-secondary">
                  <Lock className="mt-0.5 size-4 shrink-0 text-neon-purple" aria-hidden="true" />
                  Acceso restringido y protegido
                </li>
                <li className="flex items-start gap-2.5 text-[12.5px] text-text-secondary">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-neon-purple" aria-hidden="true" />
                  Cifrado de extremo a extremo
                </li>
                <li className="flex items-start gap-2.5 text-[12.5px] text-text-secondary">
                  <Cloud className="mt-0.5 size-4 shrink-0 text-neon-purple" aria-hidden="true" />
                  Respaldo seguro y continuo
                </li>
              </ul>
            </aside>
          </div>
        )}

        {!loading && application && (
          <p className="flex items-center justify-center gap-1.5 pb-2 text-center text-[12px] text-text-tertiary">
            <Lock className="size-3.5" aria-hidden="true" />
            Tu información está segura y protegida.
          </p>
        )}
      </div>
    </Layout>
  )
}
