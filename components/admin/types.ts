/**
 * Tipos y datos mock compartidos por los componentes del Admin Dashboard
 * (Release 3 — KPIs + Reportes ejecutivos).
 *
 * Todo lo aquí definido es MOCK hasta que existan endpoints agregados reales
 * (ej. `/api/admin/kpis`). Se aisla en este archivo para que reemplazar el
 * mock por datos reales en el futuro sea un cambio de una sola fuente.
 */

import { APPLICATION_STAGES, STAGE_LABELS } from "@/components/dashboard/types"

export interface FunnelStage {
  stage: string
  label: string
  count: number
}

export interface ScoringDistributionItem {
  category: "BRONCE" | "PLATA" | "ORO" | "PLATINO"
  label: string
  percentage: number
  color: string
}

export interface TimelinePoint {
  day: number
  closures: number
}

export interface TopLead {
  id: string
  client: string
  category: "BRONCE" | "PLATA" | "ORO" | "PLATINO"
  stage: string
  daysInStage: number
}

export interface AdvisorPerformance {
  advisor: string
  leadsAssigned: number
  closures: number
  conversionRate: number
}

export interface KpiSummary {
  totalLeadsThisMonth: number
  conversionRate: number
  avgDaysToClose: number
  revenueThisMonth: number
}

/** Mock del funnel de conversión sobre los 9 estados reales del pipeline. */
export const MOCK_FUNNEL: FunnelStage[] = [
  { stage: APPLICATION_STAGES[0], label: STAGE_LABELS[APPLICATION_STAGES[0]], count: 248 },
  { stage: APPLICATION_STAGES[1], label: STAGE_LABELS[APPLICATION_STAGES[1]], count: 211 },
  { stage: APPLICATION_STAGES[2], label: STAGE_LABELS[APPLICATION_STAGES[2]], count: 176 },
  { stage: APPLICATION_STAGES[3], label: STAGE_LABELS[APPLICATION_STAGES[3]], count: 142 },
  { stage: APPLICATION_STAGES[4], label: STAGE_LABELS[APPLICATION_STAGES[4]], count: 118 },
  { stage: APPLICATION_STAGES[5], label: STAGE_LABELS[APPLICATION_STAGES[5]], count: 95 },
  { stage: APPLICATION_STAGES[6], label: STAGE_LABELS[APPLICATION_STAGES[6]], count: 71 },
  { stage: APPLICATION_STAGES[7], label: STAGE_LABELS[APPLICATION_STAGES[7]], count: 52 },
  { stage: APPLICATION_STAGES[8], label: STAGE_LABELS[APPLICATION_STAGES[8]], count: 38 },
]

export const MOCK_SCORING_DISTRIBUTION: ScoringDistributionItem[] = [
  { category: "BRONCE", label: "Bronce", percentage: 30, color: "var(--bronce)" },
  { category: "PLATA", label: "Plata", percentage: 40, color: "var(--plata)" },
  { category: "ORO", label: "Oro", percentage: 25, color: "var(--oro)" },
  { category: "PLATINO", label: "Platino", percentage: 5, color: "var(--platino)" },
]

/** 30 días de mock, con tendencia ascendente hacia fin de mes. */
export const MOCK_TIMELINE: TimelinePoint[] = Array.from({ length: 30 }, (_, i) => {
  const day = i + 1
  const base = Math.round(1 + Math.sin(day / 4) * 1.5 + day * 0.08)
  return { day, closures: Math.max(0, base) }
})

export const MOCK_TOP_LEADS: TopLead[] = [
  { id: "LD-1042", client: "Javiera Muñoz", category: "PLATINO", stage: "ENVIADO_A_BANCO", daysInStage: 3 },
  { id: "LD-1038", client: "Rodrigo Silva", category: "ORO", stage: "VISITA_COMPLETADA", daysInStage: 5 },
  { id: "LD-1035", client: "Camila Torres", category: "ORO", stage: "PRE_EVALUACION_COMPLETADA", daysInStage: 2 },
  { id: "LD-1031", client: "Matías Rojas", category: "PLATINO", stage: "ESCRITURACION_AGENDADA", daysInStage: 1 },
  { id: "LD-1029", client: "Francisca Vera", category: "PLATA", stage: "DOCUMENTOS_APROBADOS", daysInStage: 6 },
  { id: "LD-1024", client: "Sebastián Paredes", category: "ORO", stage: "DOCUMENTOS_PENDIENTES", daysInStage: 4 },
  { id: "LD-1020", client: "Antonia Fuentes", category: "PLATA", stage: "SCORING_COMPLETADO", daysInStage: 2 },
  { id: "LD-1017", client: "Ignacio Herrera", category: "BRONCE", stage: "RECEPCIONADA", daysInStage: 1 },
  { id: "LD-1015", client: "Valentina Castro", category: "ORO", stage: "ENVIADO_A_BANCO", daysInStage: 8 },
  { id: "LD-1011", client: "Diego Contreras", category: "PLATA", stage: "VISITA_COMPLETADA", daysInStage: 3 },
]

export const MOCK_ADVISOR_PERFORMANCE: AdvisorPerformance[] = [
  { advisor: "María José Lira", leadsAssigned: 62, closures: 14, conversionRate: 22.6 },
  { advisor: "Tomás Bravo", leadsAssigned: 54, closures: 11, conversionRate: 20.4 },
  { advisor: "Constanza Reyes", leadsAssigned: 49, closures: 9, conversionRate: 18.4 },
  { advisor: "Felipe Órdenes", leadsAssigned: 41, closures: 6, conversionRate: 14.6 },
]

export const MOCK_KPI_SUMMARY: KpiSummary = {
  totalLeadsThisMonth: 248,
  conversionRate: 15.3,
  avgDaysToClose: 34,
  revenueThisMonth: 68_400_000,
}

export const MOCK_PROPERTIES_INVENTORY = {
  total: 86,
  disponibles: 52,
  reservadas: 21,
  vendidas: 13,
}

export const MOCK_CLOSURES_DETAIL = [
  { id: "LD-0987", client: "Paula Espinoza", date: "2026-07-02", uf: 3120 },
  { id: "LD-0972", client: "Cristóbal Naranjo", date: "2026-07-05", uf: 2850 },
  { id: "LD-0965", client: "Loreto Aguilera", date: "2026-07-09", uf: 4100 },
  { id: "LD-0951", client: "Andrés Toledo", date: "2026-07-11", uf: 2600 },
]

export function formatCLP(amount: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(amount)
}
