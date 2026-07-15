"use client"

import { Building2 } from "lucide-react"

const BAND_LABELS: Record<string, string> = {
  "1": "1 departamento",
  "2-4": "2 a 4 departamentos",
  "5-6": "5 a 6 departamentos",
}

const PURPOSE_LABELS: Record<string, string> = {
  inversion: "inversión",
  vivienda_propia: "vivienda propia",
}

/**
 * Recordatorio compacto de la propuesta inicial (simulación) que el cliente
 * eligió antes de subir documentos -- visible en las etapas siguientes
 * (documentación en adelante) para que no la pierda de vista mientras
 * espera la confirmación real tras el envío al banco.
 */
function InitialProposalReminder({ band, purpose }: { band: string; purpose: string }) {
  return (
    <div className="glass-card flex items-center gap-3 rounded-xl border border-glass-border p-4">
      <Building2 className="size-5 shrink-0 text-neon-cyan" />
      <p className="text-sm text-text-secondary">
        Tu propuesta inicial simulada: <span className="font-medium text-text-primary">{BAND_LABELS[band] ?? band}</span>{" "}
        para <span className="font-medium text-text-primary">{PURPOSE_LABELS[purpose] ?? purpose}</span>. Sigue siendo
        una simulación hasta que el banco confirme tras revisar tus documentos.
      </p>
    </div>
  )
}

export { InitialProposalReminder }
