"use client"

import { useState } from "react"
import { Eye, FileText, Check, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { DOCUMENT_STATUS_LABELS, DOCUMENT_TYPE_LABELS, type DocumentRow } from "./types"

const STATUS_STYLES: Record<DocumentRow["status"], string> = {
  pendiente: "border-status-warning/40 bg-status-warning/10 text-status-warning",
  en_revision: "border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan",
  aprobado: "border-neon-green/40 bg-neon-green/10 text-neon-green",
  rechazado: "border-error/40 bg-error/10 text-error",
}

interface DocumentsSectionProps {
  documents: DocumentRow[]
  onDocumentsChange: (documents: DocumentRow[]) => void
}

/** Sección de gestión documental del asesor: ver, aprobar y rechazar
 * documentos subidos por el cliente. */
function DocumentsSection({ documents, onDocumentsChange }: DocumentsSectionProps) {
  const [viewing, setViewing] = useState<DocumentRow | null>(null)
  const [viewUrl, setViewUrl] = useState<string | null>(null)
  const [approving, setApproving] = useState<DocumentRow | null>(null)
  const [rejecting, setRejecting] = useState<DocumentRow | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [busyId, setBusyId] = useState<string | null>(null)

  async function handleView(doc: DocumentRow) {
    setViewing(doc)
    setViewUrl(null)
    try {
      const supabase = createSupabaseBrowserClient()
      const { data, error } = await supabase.storage
        .from("documents")
        .createSignedUrl(doc.url, 60 * 5)
      if (error || !data?.signedUrl) throw error ?? new Error("No se pudo generar la URL")
      setViewUrl(data.signedUrl)
    } catch {
      toast.error("No se pudo generar la vista previa del documento.")
    }
  }

  async function updateStatus(doc: DocumentRow, status: DocumentRow["status"], reason?: string) {
    setBusyId(doc.id)
    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const updated: DocumentRow = await res.json()

      // Motivo de rechazo: `documents.extracted_data` (JSONB) no tiene
      // endpoint dedicado para esto todavía, así que se guarda directo con
      // el cliente browser de Supabase (RLS deshabilitado en el MVP, ver
      // CLAUDE.md) mezclado con lo que ya hubiera en extracted_data.
      if (reason) {
        // `lib/supabase/types.ts` is still the DB Architect's placeholder
        // (`Tables: Record<string, never>`), same bridge cast used in
        // app/api/documents/route.ts until real generated types land.
        const supabase = createSupabaseBrowserClient()
        await (supabase.from("documents") as any)
          .update({
            extracted_data: { ...(doc.extracted_data ?? {}), rejection_reason: reason },
          })
          .eq("id", doc.id)
        updated.extracted_data = { ...(doc.extracted_data ?? {}), rejection_reason: reason }
      }

      onDocumentsChange(documents.map((d) => (d.id === doc.id ? updated : d)))
      toast.success(status === "aprobado" ? "Documento aprobado." : "Documento rechazado.")
    } catch {
      toast.error("No se pudo actualizar el estado del documento.")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Card className="glass-card border-glass-border">
      <CardHeader>
        <CardTitle>Documentos</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {documents.length === 0 && (
          <p className="text-sm text-text-tertiary">El cliente aún no ha subido documentos.</p>
        )}

        {documents.map((doc) => (
          <div
            key={doc.id}
            className="flex flex-col gap-2 rounded-lg border border-glass-border bg-glass p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="size-4 shrink-0 text-text-tertiary" />
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm text-text-primary">
                  {DOCUMENT_TYPE_LABELS[doc.type] ?? doc.type}
                </span>
                <span className="text-xs text-text-tertiary">
                  {new Date(doc.created_at).toLocaleDateString("es-CL")}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-xs font-medium",
                  STATUS_STYLES[doc.status]
                )}
              >
                {DOCUMENT_STATUS_LABELS[doc.status]}
              </span>
              <Button size="sm" variant="outline" onClick={() => handleView(doc)}>
                <Eye />
                Ver
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busyId === doc.id || doc.status === "aprobado"}
                onClick={() => setApproving(doc)}
                className="text-neon-green hover:text-neon-green"
              >
                <Check />
                Aprobar
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busyId === doc.id || doc.status === "rechazado"}
                onClick={() => setRejecting(doc)}
                className="text-error hover:text-error"
              >
                <X />
                Rechazar
              </Button>
            </div>
          </div>
        ))}
      </CardContent>

      {/* Modal: ver documento */}
      <Dialog open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {viewing ? DOCUMENT_TYPE_LABELS[viewing.type] ?? viewing.type : ""}
            </DialogTitle>
            <DialogDescription>Vista previa del documento subido por el cliente.</DialogDescription>
          </DialogHeader>
          {viewUrl ? (
            <a
              href={viewUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center rounded-lg border border-glass-border bg-glass p-6 text-sm text-neon-cyan hover:underline"
            >
              Abrir documento en una nueva pestaña
            </a>
          ) : (
            <p className="text-sm text-text-tertiary">Generando vista previa...</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal: aprobar */}
      <Dialog open={!!approving} onOpenChange={(open) => !open && setApproving(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprobar documento</DialogTitle>
            <DialogDescription>
              ¿Confirmas que {approving ? DOCUMENT_TYPE_LABELS[approving.type] ?? approving.type : "este documento"} cumple los requisitos?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproving(null)}>
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                if (approving) await updateStatus(approving, "aprobado")
                setApproving(null)
              }}
            >
              Confirmar aprobación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: rechazar */}
      <Dialog
        open={!!rejecting}
        onOpenChange={(open) => {
          if (!open) {
            setRejecting(null)
            setRejectReason("")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar documento</DialogTitle>
            <DialogDescription>Indica el motivo del rechazo para que el cliente pueda corregirlo.</DialogDescription>
          </DialogHeader>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Ej: la liquidación corresponde a un mes anterior..."
            rows={4}
            className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm text-text-primary outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejecting(null)
                setRejectReason("")
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim()}
              onClick={async () => {
                if (rejecting) await updateStatus(rejecting, "rechazado", rejectReason.trim())
                setRejecting(null)
                setRejectReason("")
              }}
            >
              Confirmar rechazo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

export { DocumentsSection }
