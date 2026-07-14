"use client"

import * as React from "react"
import { toast } from "sonner"
import {
  CheckCircle2Icon,
  ClockIcon,
  FileIcon,
  AlertTriangleIcon,
  UploadCloudIcon,
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
  const isPending = status === "pendiente" || status === "en_revision"

  return (
    <div
      className={cn(
        "glass-card flex flex-col gap-3 rounded-xl p-4 transition-colors duration-200",
        isApproved && "glow-green"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-elevated",
              isApproved && "border-neon-green/40"
            )}
          >
            {isApproved ? (
              <CheckCircle2Icon className="size-5 text-neon-green" />
            ) : status === "rechazado" ? (
              <AlertTriangleIcon className="size-5 text-status-error" />
            ) : isPending ? (
              <ClockIcon className="size-5 text-status-warning" />
            ) : (
              <FileIcon className="size-5 text-text-tertiary" />
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-text-primary">{typeLabel}</span>
            {status && (
              <span
                className={cn(
                  "text-xs",
                  isApproved && "text-neon-green",
                  status === "rechazado" && "text-status-error",
                  isPending && "text-status-warning"
                )}
              >
                {DOCUMENT_STATUS_LABELS[status] ?? status}
              </span>
            )}
          </div>
        </div>
      </div>

      {status === "rechazado" && (
        <div className="flex flex-col gap-1 text-xs text-status-error">
          <p>Este documento fue rechazado. Vuelve a subirlo con la información correcta.</p>
          {document?.extracted_data?.validation?.reasons?.map((reason, index) => (
            <p key={index} className="text-text-tertiary">
              • {reason}
            </p>
          ))}
        </div>
      )}

      {clientError && <p className="text-xs text-status-error">{clientError}</p>}

      <div className="mt-1">
        {isApproved ? (
          <span className="text-xs text-text-tertiary">Documento aprobado, no requiere acción.</span>
        ) : (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-primary transition-colors duration-200 hover:border-neon-cyan hover:text-neon-cyan disabled:cursor-not-allowed disabled:opacity-50",
              isPending && "border-status-warning/40"
            )}
          >
            {isSubmitting ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <UploadCloudIcon className="size-4" />
            )}
            {isSubmitting
              ? "Subiendo..."
              : status === "rechazado"
                ? "Volver a subir"
                : isPending
                  ? "Reemplazar archivo"
                  : "Subir"}
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          className="hidden"
          disabled={!canUpload && !isPending}
          onChange={(e) => handleFileSelected(e.target.files?.[0] ?? null)}
        />
      </div>
    </div>
  )
}

export { DocumentVaultItem }
