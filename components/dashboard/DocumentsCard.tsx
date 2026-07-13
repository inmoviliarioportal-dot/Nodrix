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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documentos</CardTitle>
        <CardAction>
          <Button size="sm" onClick={onUploadClick}>
            Subir documentos
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-text-secondary">
          {total > 0
            ? `${approved}/${total} aprobados`
            : "Aún no has subido documentos."}
        </p>
      </CardContent>
    </Card>
  )
}

export { DocumentsCard }
