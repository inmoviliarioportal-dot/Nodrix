"use client"

import { useState } from "react"
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
import type { ApplicationRow } from "@/lib/leads"
import { NEXT_STAGE, STAGE_LABELS, type ApplicationStage, type StageHistoryRow } from "./types"

interface StateTransitionProps {
  application: ApplicationRow
  onUpdated: (application: ApplicationRow, stageHistory: StageHistoryRow[]) => void
}

/**
 * Selector de transición de estado.
 *
 * El pipeline es lineal (9 estados, sin ramas) — `NEXT_STAGE` (espejo
 * client-side de `STAGE_TRANSITIONS` en
 * `app/api/applications/[id]/stage/route.ts`) resuelve el único siguiente
 * estado legal, así que en vez de un `<select>` con muchas opciones se
 * muestra el próximo estado propuesto directamente. La validación real y
 * definitiva (incluida la regla "scoring_score debe existir para pasar de
 * RECEPCIONADA a SCORING_COMPLETADO") vive y se re-valida en el servidor —
 * si la API rechaza la transición, el error se muestra igual.
 */
function StateTransition({ application, onUpdated }: StateTransitionProps) {
  const [note, setNote] = useState("")
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const currentStage = application.stage as ApplicationStage
  const nextStage = NEXT_STAGE[currentStage]

  async function handleApply() {
    if (!nextStage) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/applications/${application.id}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: nextStage, note: note.trim() || undefined }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.error?.message ?? data?.message ?? `Error ${res.status}`)
      }
      onUpdated(data.application, data.stageHistory ?? [])
      setNote("")
      toast.success(`Estado actualizado a "${STAGE_LABELS[nextStage]}".`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo cambiar el estado.")
    } finally {
      setSubmitting(false)
      setConfirmOpen(false)
    }
  }

  return (
    <Card className="glass-card border-glass-border">
      <CardHeader>
        <CardTitle>Cambiar estado</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {nextStage ? (
          <>
            <p className="text-sm text-text-secondary">
              Estado actual:{" "}
              <span className="text-text-primary">{STAGE_LABELS[currentStage] ?? currentStage}</span>
              <br />
              Siguiente estado disponible:{" "}
              <span className="font-medium text-neon-purple">{STAGE_LABELS[nextStage]}</span>
            </p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Nota al cambiar de estado (opcional)"
              rows={2}
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm text-text-primary outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <Button className="glow-purple self-end" disabled={submitting} onClick={() => setConfirmOpen(true)}>
              Aplicar estado
            </Button>
          </>
        ) : (
          <p className="text-sm text-text-tertiary">
            {STAGE_LABELS[currentStage] ?? currentStage} es un estado terminal — no hay más transiciones.
          </p>
        )}
      </CardContent>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar cambio de estado</DialogTitle>
            <DialogDescription>
              {nextStage &&
                `La aplicación pasará de "${STAGE_LABELS[currentStage]}" a "${STAGE_LABELS[nextStage]}". Esta acción queda registrada en el historial.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={handleApply} disabled={submitting}>
              {submitting ? "Aplicando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

export { StateTransition }
