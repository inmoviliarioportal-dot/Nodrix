"use client"

import { toast } from "sonner"
import { FileTextIcon, FileSpreadsheetIcon, FileIcon } from "lucide-react"

import { MOCK_FUNNEL } from "@/components/admin/types"

/**
 * Botones de exportación. CSV es una exportación REAL (genera un Blob
 * client-side con el resumen del funnel). PDF y Excel son decorativos
 * (mock) hasta que se incorpore una librería de generación real
 * (ej. jspdf / exceljs) — ver reporte de este agente.
 */
export function ExportButtons() {
  function handleExportCsv() {
    const header = "Estado,Leads,% del total\n"
    const total = MOCK_FUNNEL[0]?.count ?? 1
    const rows = MOCK_FUNNEL.map(
      (s) => `${s.label},${s.count},${((s.count / total) * 100).toFixed(1)}%`
    ).join("\n")
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `reporte-nodrix-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    toast.success("CSV exportado.")
  }

  function handleExportMock(format: string) {
    toast.info(`Exportación a ${format} pendiente de librería (mock en Release 3).`)
  }

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <button
        type="button"
        onClick={handleExportCsv}
        className="glow-cyan inline-flex items-center gap-2 rounded-lg border border-glass-border bg-glass px-3.5 py-2 text-sm font-medium text-text-primary transition-transform duration-200 hover:-translate-y-0.5"
      >
        <FileSpreadsheetIcon className="size-4 text-neon-cyan" />
        Exportar CSV
      </button>
      <button
        type="button"
        onClick={() => handleExportMock("PDF")}
        className="inline-flex items-center gap-2 rounded-lg border border-glass-border bg-glass px-3.5 py-2 text-sm font-medium text-text-secondary transition-colors duration-200 hover:text-text-primary"
      >
        <FileTextIcon className="size-4 text-neon-purple" />
        Exportar PDF
      </button>
      <button
        type="button"
        onClick={() => handleExportMock("Excel")}
        className="inline-flex items-center gap-2 rounded-lg border border-glass-border bg-glass px-3.5 py-2 text-sm font-medium text-text-secondary transition-colors duration-200 hover:text-text-primary"
      >
        <FileIcon className="size-4 text-neon-green" />
        Exportar Excel
      </button>
    </div>
  )
}
