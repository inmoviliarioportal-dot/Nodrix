"use client"

import * as React from "react"
import { toast } from "sonner"
import {
  FileTextIcon,
  UploadCloudIcon,
  EyeIcon,
  Loader2Icon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { DOCUMENT_STATUS_LABELS, type DocumentRecord } from "@/components/dashboard/types"

/** MIME types allowed by `POST /api/documents` (mirrors app/api/documents/route.ts). */
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
])

/** Max upload size: 10MB (mirrors app/api/documents/route.ts). */
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

export interface DocumentVaultItemProps {
  typeValue: string
  typeLabel: string
  applicationId: string
  document?: DocumentRecord
  onUploaded: () => void
}

/**
 * Ítem individual de la Bóveda Documental: un tipo de documento requerido,
 * su estado actual (si existe) y el botón de carga/reemplazo correspondiente.
 */
function DocumentVaultItem({
  typeValue,
  typeLabel,
  applicationId,
  document,
  onUploaded,
}: DocumentVaultItemProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [clientError, setClientError] = React.useState<string | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const status = document?.status

  function validateFile(file: File): string | null {
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return `Formato no permitido (${file.type || "desconocido"}). Solo se aceptan PDF, JPG, PNG o WEBP.`
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `Archivo demasiado grande (${(file.size / (1024 * 1024)).toFixed(1)}MB). Máximo permitido: 10MB.`
    }
    return null
  }

  async function handleFileSelected(file: File | null) {
    if (!file) return
    setClientError(null)

    const validationError = validateFile(file)
    if (validationError) {
      setClientError(validationError)
      toast.error(validationError)
      return
    }

    setIsSubmitting(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("type", typeValue)
      formData.append("applicationId", applicationId)

      const res = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error ?? `Error ${res.status} al subir el documento`)
      }

      toast.success(`${typeLabel} subido correctamente.`)
      onUploaded()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo subir el documento."
      setClientError(message)
      toast.error(message)
    } finally {
      setIsSubmitting(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  const canUpload = !status || status === "rechazado"
  const isApproved = status === "aprobado"
  const isInReview = status === "en_revision"
  const isRejected = status === "rechazado"
  const isPending = status === "pendiente"
  const canView = (isApproved || isInReview) && Boolean(document?.url)

  /** Pill de estado: colores por semántica (verde=aprobado, cyan=en revisión, neutro=pendiente, error=rechazado). */
  const statusPillClass = isApproved
    ? "border-neon-green/40 bg-neon-green/10 text-neon-green"
    : isInReview
      ? "border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan"
      : isRejected
        ? "border-status-error/40 bg-status-error/10 text-status-error"
        : status === "pendiente"
          ? "border-gold/40 bg-gold/10 text-gold"
          : "border-gold/30 bg-gold/10 text-gold"

  return (
    <div className="glass-card interactive-lift flex flex-col gap-2.5 rounded-2xl p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-dark-tertiary">
            <FileTextIcon className="size-4.5 text-neon-cyan" />
          </div>
          <span className="truncate text-sm font-semibold text-text-primary">{typeLabel}</span>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
            statusPillClass
          )}
        >
          {status ? (DOCUMENT_STATUS_LABELS[status] ?? status) : "Pendiente"}
        </span>
      </div>

      {isRejected && (
        <div className="flex flex-col gap-1 text-xs text-status-error">
          <p>Rechazado. Vuelve a subirlo con la información correcta.</p>
          {document?.extracted_data?.validation?.reasons?.map((reason, index) => (
            <p key={index} className="text-text-tertiary">
              • {reason}
            </p>
          ))}
        </div>
      )}

      {clientError && <p className="text-xs text-status-error">{clientError}</p>}

      <div className="flex items-center gap-2">
        {canView && (
          <a
            href={document?.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-text-primary transition-colors duration-200 hover:border-neon-cyan hover:text-neon-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan"
          >
            <EyeIcon className="size-4" />
            Ver documento
          </a>
        )}
        {!isApproved && (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full border border-neon-cyan/40 px-3 py-2 text-xs font-semibold text-neon-cyan transition-colors duration-200 hover:bg-neon-cyan/5 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan",
              isInReview && "border-neon-cyan/40"
            )}
          >
            {isSubmitting ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <UploadCloudIcon className="size-4" />
            )}
            {isSubmitting
              ? "Subiendo..."
              : isRejected
                ? "Volver a subir"
                : isInReview || isPending
                  ? "Reemplazar archivo"
                  : "Subir documento"}
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          className="hidden"
          disabled={!canUpload && !isPending && !isInReview}
          onChange={(e) => handleFileSelected(e.target.files?.[0] ?? null)}
        />
      </div>
    </div>
  )
}

export { DocumentVaultItem }
