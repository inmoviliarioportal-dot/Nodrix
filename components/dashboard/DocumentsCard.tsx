import Link from "next/link"
import { FileText } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { DocumentRecord } from "./types"

export interface DocumentsCardProps {
  documents: DocumentRecord[]
}

/** Tile de documentos: ícono + progreso de aprobación + botón que lleva a la Bóveda documental. */
function DocumentsCard({ documents }: DocumentsCardProps) {
  const total = documents.length
  const approved = documents.filter((doc) => doc.status === "aprobado").length

  return (
    <div className="glass-card flex items-center justify-between gap-3 rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-dark-tertiary text-neon-cyan">
          <FileText className="size-5" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1">
          <span className="text-[10.5px] font-bold uppercase tracking-wide text-text-tertiary">
            Documentos
          </span>
          <p className="text-[13px] font-semibold text-text-primary">
            {total === 0
              ? "Aún no has subido documentos"
              : approved === total
                ? "Todos tus documentos fueron aprobados"
                : `${approved}/${total} aprobados`}
          </p>
          <Button size="sm" variant="outline" className="mt-1 w-fit rounded-full" render={<Link href="/dashboard/documents" />}>
            Subir documentos
          </Button>
        </div>
      </div>
      <span className="shrink-0 text-lg font-semibold text-text-primary">
        {total > 0 ? `${approved}/${total}` : "0/0"}
      </span>
    </div>
  )
}

export { DocumentsCard }
