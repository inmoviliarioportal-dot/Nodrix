import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { DocumentRecord } from "./types"

export interface DocumentsCardProps {
  documents: DocumentRecord[]
  onUploadClick: () => void
}

/** Card de documentos: progreso de aprobación + botón para abrir el modal de subida. */
function DocumentsCard({ documents, onUploadClick }: DocumentsCardProps) {
  const total = documents.length
  const approved = documents.filter((doc) => doc.status === "aprobado").length

  const percent = total > 0 ? Math.round((approved / total) * 100) : 0

  return (
    <Card size="sm" className="gap-1.5">
      <CardHeader>
        <CardTitle className="text-[13px] font-bold text-text-primary">Documentos</CardTitle>
        <CardAction>
          <span className="text-[11px] font-semibold text-text-tertiary">
            {total > 0 ? `${approved}/${total}` : "0/0"}
          </span>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {total > 0 && (
          <div className="h-[5px] w-full overflow-hidden rounded-full bg-glass-border">
            <div
              className="h-full rounded-full bg-neon-green transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
        )}
        <p className="text-[12.5px] leading-relaxed text-text-secondary">
          {total === 0
            ? "Aún no has subido documentos."
            : approved === total
              ? "Todos tus documentos fueron aprobados."
              : `${approved}/${total} aprobados. Faltan ${total - approved} documento${total - approved === 1 ? "" : "s"}.`}
        </p>
        <Button size="sm" variant="outline" className="w-fit" onClick={onUploadClick}>
          Subir documentos
        </Button>
      </CardContent>
    </Card>
  )
}

export { DocumentsCard }
