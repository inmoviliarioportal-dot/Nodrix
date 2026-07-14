/**
 * Tipos compartidos de la pantalla de Propuesta (Fase 4).
 *
 * NOTA IMPORTANTE: las métricas de inversión (capRate, plusvalia, flujoMensual)
 * son ILUSTRATIVAS/ESTIMADAS en el MVP. El motor de pre-evaluación real de
 * inversión (Release 2+) todavía no existe — hasta entonces estas cifras se
 * calculan con una heurística simple basada en el precio de la propiedad, solo
 * para efectos de demo/UX. No representan un compromiso financiero real.
 */
export interface ProposalProperty {
  id: string
  name: string
  location: string
  price: number
  imageUrl?: string
  /** Cap Rate estimado, ej. 9.1 (%) */
  capRate: number
  /** Plusvalía proyectada estimada, ej. 14.5 (%) */
  plusvalia: number
  /** Flujo mensual estimado en CLP */
  flujoMensual: number
}

/**
 * Shape esperada del resultado de scoring guardado en sessionStorage por el
 * Agente AI Processing. Se es tolerante: todos los campos son opcionales y se
 * usan valores por defecto razonables si faltan (ver lib/proposal-data.ts).
 */
export interface OnboardingScoringResult {
  category?: "BRONCE" | "PLATA" | "ORO" | "PLATINO" | "BLACK" | string
  score?: number
  leadId?: string
  applicationId?: string
  [key: string]: unknown
}
