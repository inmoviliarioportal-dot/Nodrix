"use client"

import { cn } from "@/lib/utils"

export interface VersionListItem {
  version: number
  status: "draft" | "active" | "archived" | "default"
  note: string | null
  simulated_at: string | null
  created_at: string
  created_by: string | null
  creator?: { id: string; full_name: string | null; email: string | null } | null
}

const STATUS_LABELS: Record<VersionListItem["status"], string> = {
  draft: "Borrador",
  active: "Activa",
  archived: "Archivada",
  default: "Default",
}

const STATUS_CLASSES: Record<VersionListItem["status"], string> = {
  draft: "bg-status-warning/15 text-status-warning",
  active: "bg-status-success/15 text-status-success",
  archived: "bg-glass-border/40 text-text-tertiary",
  default: "bg-glass-border/40 text-text-tertiary",
}

export function VersionHistoryTable({
  versions,
  selectedVersion,
  onSelect,
}: {
  versions: VersionListItem[]
  selectedVersion: number | null
  onSelect: (version: number) => void
}) {
  if (versions.length === 0) {
    return <p className="text-sm text-text-tertiary">Todavía no hay versiones de variables del wizard.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-glass-border text-left text-xs uppercase tracking-wide text-text-tertiary">
            <th className="py-2 pr-2">Versión</th>
            <th className="px-2 py-2">Estado</th>
            <th className="px-2 py-2">Nota</th>
            <th className="px-2 py-2">Publicado por</th>
            <th className="px-2 py-2">Creado</th>
          </tr>
        </thead>
        <tbody>
          {versions.map((v) => (
            <tr
              key={v.version}
              onClick={() => onSelect(v.version)}
              className={cn(
                "cursor-pointer border-b border-glass-border/50 hover:bg-surface-elevated/60",
                v.status === "active" && "bg-status-success/5",
                selectedVersion === v.version && "outline outline-1 outline-neon-cyan/50"
              )}
            >
              <td className="py-2 pr-2 font-medium text-text-primary">v{v.version}</td>
              <td className="px-2 py-2">
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_CLASSES[v.status])}>
                  {STATUS_LABELS[v.status]}
                </span>
              </td>
              <td className="px-2 py-2 text-text-secondary">{v.note ?? "--"}</td>
              <td className="px-2 py-2 text-text-secondary">
                {v.creator?.full_name ?? v.creator?.email ?? (v.created_by ? "--" : "sistema")}
              </td>
              <td className="px-2 py-2 text-xs text-text-tertiary">
                {v.created_at ? new Date(v.created_at).toLocaleString("es-CL") : "--"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
