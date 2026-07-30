import { FileCheck2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { DocumentRecord } from "./types"

export interface DocumentsCardProps {
  documents: DocumentRecord[]
  onUploadClick: () => void
}

/** Tile compacto de documentos: progreso de aprobación + botón para abrir el modal de subida. */
function DocumentsCard({ documents, onUploadClick }: DocumentsCardProps) {
  const total = documents.length
  const approved = documents.filter((doc) => doc.status === "aprobado").length
  const percent = total > 0 ? Math.round((approved / total) * 100) : 0

  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-glass-border p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-text-tertiary">
          <FileCheck2 className="size-3.5 text-neon-cyan" aria-hidden="true" />
          Documentos
        </span>
        <span className="text-[11px] font-semibold text-text-tertiary">{total > 0 ? `${approved}/${total}` : "0/0"}</span>
      </div>
      {total > 0 && (
        <div className="h-[4px] w-full overflow-hidden rounded-full bg-glass-border">
          <div
            className="h-full rounded-full bg-neon-green transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
      <p className="line-clamp-2 text-[12px] leading-snug text-text-secondary">
        {total === 0
          ? "Aún no has subido documentos."
          : approved === total
            ? "Todos tus documentos fueron aprobados."
            : `${approved}/${total} aprobados. Faltan ${total - approved}.`}
      </p>
      <Button size="sm" variant="outline" className="w-fit" onClick={onUploadClick}>
        Subir documentos
      </Button>
    </div>
  )
}

export { DocumentsCard }
