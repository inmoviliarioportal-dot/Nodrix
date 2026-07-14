"use client"

import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { isNoteOnlyEntry, type StageHistoryRow } from "./types"

interface NotesSectionProps {
  applicationId: string
  actorUserId: string | null
  currentStage: string
  stageHistory: StageHistoryRow[]
  onHistoryChange: (history: StageHistoryRow[]) => void
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString("es-CL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/**
 * Notas internas del asesor sobre la aplicación.
 *
 * No existe todavía un endpoint/tabla dedicado a notas (fuera del scope de
 * este agente crear uno — solo UI). Se reutiliza `application_stage_history`
 * (ya visible en el timeline) insertando filas con `from_stage === to_stage`
 * vía el cliente browser de Supabase (RLS deshabilitado en el MVP, ver
 * CLAUDE.md): quedan marcadas como "solo nota" y no alteran el stage real de
 * la aplicación. `StageTimeline` las excluye para no confundirlas con
 * transiciones de estado.
 */
function NotesSection({
  applicationId,
  actorUserId,
  currentStage,
  stageHistory,
  onHistoryChange,
}: NotesSectionProps) {
  const [draft, setDraft] = useState("")
  const [saving, setSaving] = useState(false)

  const notes = [...stageHistory]
    .filter(isNoteOnlyEntry)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  async function handleSave() {
    const text = draft.trim()
    if (!text) return
    setSaving(true)
    try {
      // `lib/supabase/types.ts` is still the DB Architect's placeholder
      // (`Tables: Record<string, never>`), same bridge cast used across the
      // API routes until real generated types land.
      const supabase = createSupabaseBrowserClient()
      const { data, error } = await (supabase.from("application_stage_history") as any)
        .insert({
          application_id: applicationId,
          from_stage: currentStage,
          to_stage: currentStage,
          actor_user_id: actorUserId,
          note: text,
        })
        .select("*")
        .single()

      if (error) throw error

      onHistoryChange([data as StageHistoryRow, ...stageHistory])
      setDraft("")
      toast.success("Nota guardada.")
    } catch {
      toast.error("No se pudo guardar la nota.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="glass-card border-glass-border">
      <CardHeader>
        <CardTitle>Notas</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Agregar una nota interna sobre esta aplicación..."
            rows={3}
            className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm text-text-primary outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <Button size="sm" className="self-end" disabled={!draft.trim() || saving} onClick={handleSave}>
            {saving ? "Guardando..." : "Guardar nota"}
          </Button>
        </div>

        <div className="flex flex-col gap-3">
          {notes.length === 0 && (
            <p className="text-sm text-text-tertiary">Aún no hay notas registradas.</p>
          )}
          {notes.map((note) => (
            <div key={note.id} className="rounded-lg border border-glass-border bg-glass p-3">
              <p className="text-sm text-text-primary">{note.note}</p>
              <p className="mt-1 text-xs text-text-tertiary">{formatTimestamp(note.created_at)}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export { NotesSection }
