"use client"

import * as React from "react"
import { toast } from "sonner"
import { UploadCloudIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { DOCUMENT_TYPES } from "./types"

export interface DocumentUploadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  applicationId: string
  /** Callback tras un upload exitoso, para refrescar el estado del dashboard. */
  onUploaded?: () => void
}

/**
 * Modal de subida de documentos: drag-drop + input file + selector de tipo.
 * Llama `POST /api/documents` (contrato Documents+Scoring) con FormData.
 */
function DocumentUploadModal({
  open,
  onOpenChange,
  applicationId,
  onUploaded,
}: DocumentUploadModalProps) {
  const [file, setFile] = React.useState<File | null>(null)
  const [documentType, setDocumentType] = React.useState<string>(DOCUMENT_TYPES[0].value)
  const [isDragging, setIsDragging] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  function resetState() {
    setFile(null)
    setDocumentType(DOCUMENT_TYPES[0].value)
    setIsDragging(false)
    setIsSubmitting(false)
  }

  async function handleSubmit() {
    if (!file) {
      toast.error("Selecciona un archivo para subir.")
      return
    }

    setIsSubmitting(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("type", documentType)
      formData.append("application_id", applicationId)

      const res = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error ?? `Error ${res.status} al subir el documento`)
      }

      toast.success("Documento subido correctamente.")
      onUploaded?.()
      onOpenChange(false)
      resetState()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo subir el documento.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) resetState()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Subir documento</DialogTitle>
          <DialogDescription>
            Arrastra un archivo o selecciónalo desde tu computador. Formatos aceptados: PDF,
            JPG, PNG.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="document-type">Tipo de documento</Label>
            <select
              id="document-type"
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            >
              {DOCUMENT_TYPES.map((docType) => (
                <option key={docType.value} value={docType.value}>
                  {docType.label}
                </option>
              ))}
            </select>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setIsDragging(false)
              const dropped = e.dataTransfer.files?.[0]
              if (dropped) setFile(dropped)
            }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border px-4 py-8 text-center transition-colors duration-200",
              isDragging && "border-gold bg-gold/5"
            )}
          >
            <UploadCloudIcon className="size-6 text-text-tertiary" />
            <p className="text-sm text-text-secondary">
              {file ? file.name : "Arrastra un archivo aquí o haz clic para seleccionar"}
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !file}>
            {isSubmitting ? "Subiendo..." : "Subir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export { DocumentUploadModal }
