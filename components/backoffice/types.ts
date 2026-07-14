import type { ApplicationRow, ApplicationStage, CustomerRow } from "@/lib/leads"
import type { ScoringCategory } from "@/components/ui/scoring-badge"

export type { ApplicationRow, ApplicationStage, CustomerRow, ScoringCategory }

/** Lead de la cola: la aplicación + su cliente (puede no estar cargado aún). */
export interface QueueLead {
  application: ApplicationRow
  customer: CustomerRow | null
}

/** Etiquetas legibles en español para cada stage del pipeline. */
export const STAGE_LABELS: Record<ApplicationStage, string> = {
  RECEPCIONADA: "Recepcionada",
  SCORING_COMPLETADO: "Scoring completado",
  DOCUMENTOS_PENDIENTES: "Documentos pendientes",
  DOCUMENTOS_APROBADOS: "Documentos aprobados",
  PRE_EVALUACION_COMPLETADA: "Pre-evaluación completada",
  VISITA_COMPLETADA: "Visita completada",
  ENVIADO_A_BANCO: "Enviado a banco",
  ESCRITURACION_AGENDADA: "Escrituración agendada",
  CIERRE: "Cierre",
}

export const SCORING_CATEGORIES: ScoringCategory[] = ["BRONCE", "PLATA", "ORO", "PLATINO"]

/** Buckets de "días en stage" para el filtro. */
export type DaysInStageBucket = "0-5" | "5-10" | "10+"

export const DAYS_BUCKET_LABELS: Record<DaysInStageBucket, string> = {
  "0-5": "0 a 5 días",
  "5-10": "5 a 10 días",
  "10+": "Más de 10 días",
}

export function daysInStage(updatedAt: string): number {
  const updated = new Date(updatedAt).getTime()
  if (Number.isNaN(updated)) return 0
  const diffMs = Date.now() - updated
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
}

export function matchesDaysBucket(days: number, bucket: DaysInStageBucket): boolean {
  if (bucket === "0-5") return days >= 0 && days <= 5
  if (bucket === "5-10") return days > 5 && days <= 10
  return days > 10
}

/** Enmascara el RUT: nunca se descifra en cliente (fuera de scope de este agente). */
export function maskRut(customer: CustomerRow | null): string {
  if (!customer?.rut_ciphertext) return "RUT no disponible"
  return "••.•••.•••-•"
}

export interface QueueFilters {
  stages: ApplicationStage[]
  categories: ScoringCategory[]
  daysBucket: DaysInStageBucket | null
  search: string
}

export const EMPTY_FILTERS: QueueFilters = {
  stages: [],
  categories: [],
  daysBucket: null,
  search: "",
}

export const QUEUE_FILTERS_STORAGE_KEY = "backoffice.queue.filters.v1"

// -----------------------------------------------------------------------------
// Vista Detalle (`/backoffice/[id]`)
// -----------------------------------------------------------------------------

/** Todos los stages en orden, para renderizar la timeline vertical completa. */
export const APPLICATION_STAGES_ORDER: ApplicationStage[] = [
  "RECEPCIONADA",
  "SCORING_COMPLETADO",
  "DOCUMENTOS_PENDIENTES",
  "DOCUMENTOS_APROBADOS",
  "PRE_EVALUACION_COMPLETADA",
  "VISITA_COMPLETADA",
  "ENVIADO_A_BANCO",
  "ESCRITURACION_AGENDADA",
  "CIERRE",
]

/**
 * Espejo de solo-lectura del state machine lineal definido en
 * `app/api/applications/[id]/stage/route.ts` (`STAGE_TRANSITIONS`). Vive acá
 * (fuera del scope de este agente es tocar la API) únicamente para que el
 * dropdown de "Aplicar estado" pueda ofrecer el único siguiente estado legal
 * sin adivinar — la validación real y definitiva sigue ocurriendo en el
 * servidor. Si la API cambia sus transiciones, actualizar este mapa.
 */
export const NEXT_STAGE: Record<ApplicationStage, ApplicationStage | null> = {
  RECEPCIONADA: "SCORING_COMPLETADO",
  SCORING_COMPLETADO: "DOCUMENTOS_PENDIENTES",
  DOCUMENTOS_PENDIENTES: "DOCUMENTOS_APROBADOS",
  DOCUMENTOS_APROBADOS: "PRE_EVALUACION_COMPLETADA",
  PRE_EVALUACION_COMPLETADA: "VISITA_COMPLETADA",
  VISITA_COMPLETADA: "ENVIADO_A_BANCO",
  ENVIADO_A_BANCO: "ESCRITURACION_AGENDADA",
  ESCRITURACION_AGENDADA: "CIERRE",
  CIERRE: null,
}

/** Documento adjunto a una aplicación (tabla `documents`, schema.sql). */
export interface DocumentRow {
  id: string
  org_id: string
  application_id: string
  type: string
  url: string
  status: "pendiente" | "en_revision" | "aprobado" | "rechazado"
  extracted_data: Record<string, unknown> | null
  created_at: string
}

export const DOCUMENT_STATUS_LABELS: Record<DocumentRow["status"], string> = {
  pendiente: "Pendiente",
  en_revision: "En revisión",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
}

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  cedula: "Cédula de identidad",
  liquidacion_sueldo: "Liquidación de sueldo",
  certificado_afp: "Certificado AFP",
  contrato_trabajo: "Contrato de trabajo",
}

/** Entrada de `application_stage_history`. Cuando `from_stage === to_stage`
 * la fila representa una NOTA (no un cambio de estado real) — ver
 * `NotesSection`, que inserta filas así directamente vía el cliente browser
 * de Supabase (RLS deshabilitado en el MVP, ver CLAUDE.md) porque no existe
 * todavía un endpoint dedicado de notas. */
export interface StageHistoryRow {
  id: string
  application_id: string
  from_stage: string | null
  to_stage: string
  actor_user_id: string | null
  note: string | null
  created_at: string
}

export function isNoteOnlyEntry(entry: StageHistoryRow): boolean {
  return entry.from_stage === entry.to_stage
}

export interface PreEvaluation {
  minUF: number
  maxUF: number
  confidence: number
}
