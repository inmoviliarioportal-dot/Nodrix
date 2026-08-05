"use client"

import { toast } from "sonner"
import { FileSpreadsheetIcon, PrinterIcon } from "lucide-react"

import { STAGE_LABELS } from "@/components/dashboard/types"
import type { ReportData } from "@/components/admin/ReportSections"

/**
 * Exportación de reportes. CSV es real (Blob client-side con el funnel +
 * cierres filtrados actuales). "Imprimir / PDF" usa el diálogo de impresión
 * del navegador (la página ya tiene estilos `print:` dedicados) en vez de
 * una librería de generación de PDF -- cubre el caso de uso sin sumar una
 * dependencia nueva solo para esto.
 */
export function ExportButtons({ data }: { data: ReportData }) {
  function handleExportCsv() {
    const funnelHeader = "Estado,Leads,% del total\n"
    const total = data.funnel[0]?.count ?? 1
    const funnelRows = data.funnel
      .map((s) => `${STAGE_LABELS[s.stage] ?? s.stage},${s.count},${((s.count / total) * 100).toFixed(1)}%`)
      .join("\n")

    const closuresHeader = "\n\nCliente,Fecha,UF\n"
    const closuresRows = data.closuresDetail.map((c) => `${c.client},${c.date.slice(0, 10)},${c.uf}`).join("\n")

    const blob = new Blob([funnelHeader + funnelRows + closuresHeader + closuresRows], {
      type: "text/csv;charset=utf-8;",
    })
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
        onClick={() => window.print()}
        className="inline-flex items-center gap-2 rounded-lg border border-glass-border bg-glass px-3.5 py-2 text-sm font-medium text-text-secondary transition-colors duration-200 hover:text-text-primary"
      >
        <PrinterIcon className="size-4 text-neon-purple" />
        Imprimir / PDF
      </button>
    </div>
  )
}
