/**
 * Tipos compartidos por los subcomponentes del dashboard cliente.
 *
 * Estos tipos reflejan el contrato documentado en
 * `.claude/agents/ui-dashboard-cliente.md` + `database/schema.sql`.
 * Se mantienen deliberadamente laxos (campos opcionales) porque los
 * endpoints reales son construidos en paralelo por otros agentes: si algún
 * campo no llega todavía, la UI debe degradar con gracia en vez de romperse.
 */

export const APPLICATION_STAGES = [
  "RECEPCIONADA",
  "SCORING_COMPLETADO",
  "DOCUMENTOS_PENDIENTES",
  "DOCUMENTOS_APROBADOS",
  "PRE_EVALUACION_COMPLETADA",
  "VISITA_COMPLETADA",
  "ENVIADO_A_BANCO",
  "ESCRITURACION_AGENDADA",
  "CIERRE",
] as const;

export type ApplicationStage = (typeof APPLICATION_STAGES)[number];

export const STAGE_LABELS: Record<string, string> = {
  RECEPCIONADA: "Recepcionada",
  SCORING_COMPLETADO: "Scoring completado",
  DOCUMENTOS_PENDIENTES: "Documentos pendientes",
  DOCUMENTOS_APROBADOS: "Documentos aprobados",
  PRE_EVALUACION_COMPLETADA: "Pre-evaluación completada",
  VISITA_COMPLETADA: "Visita completada",
  ENVIADO_A_BANCO: "Enviado a banco",
  ESCRITURACION_AGENDADA: "Escrituración agendada",
  CIERRE: "Cierre",
};

/**
 * Labels de MARKETING (más cercanos/cálidos que STAGE_LABELS) para uso en la
 * timeline del Command Center. NO reemplazan STAGE_LABELS — otros
 * componentes/agentes pueden depender de ese mapa técnico. Este mapa es
 * exclusivo de la capa de presentación del dashboard.
 */
export const STAGE_MARKETING_LABELS: Record<string, string> = {
  RECEPCIONADA: "Revisión inicial",
  SCORING_COMPLETADO: "Análisis de perfil",
  DOCUMENTOS_PENDIENTES: "Documentación",
  DOCUMENTOS_APROBADOS: "Documentos aprobados",
  PRE_EVALUACION_COMPLETADA: "Aprobado previo",
  VISITA_COMPLETADA: "Visita a propiedad",
  ENVIADO_A_BANCO: "Financiamiento",
  ESCRITURACION_AGENDADA: "Escrituración",
  CIERRE: "Cierre",
};

export const DOCUMENT_STATUSES = [
  "pendiente",
  "en_revision",
  "aprobado",
  "rechazado",
] as const;

export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export const DOCUMENT_STATUS_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  en_revision: "En revisión",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
};

export const DOCUMENT_TYPES = [
  { value: "cedula", label: "Cédula de identidad" },
  { value: "liquidacion_sueldo", label: "Liquidación de sueldo" },
  { value: "certificado_afp", label: "Certificado AFP" },
  { value: "contrato_trabajo", label: "Contrato de trabajo" },
] as const;

export interface ScoringFactor {
  factor: string;
  points: number;
  weight: number;
}

export interface ScoringResult {
  score: number;
  category: "BRONCE" | "PLATA" | "ORO" | "PLATINO" | "BLACK";
  explanation: string;
  factorsApplied?: ScoringFactor[];
  rulesVersion?: string;
}

export interface DocumentRecord {
  id: string;
  application_id?: string;
  type: string;
  url?: string;
  status: DocumentStatus | string;
  created_at?: string;
  /** Resultado de la pre-validación automática por OCR (ver lib/ocr/*). */
  extracted_data?: {
    engine?: string;
    error?: string;
    textPreview?: string;
    validation?: { valid: boolean; reasons: string[]; checks: Record<string, boolean> };
  } | null;
}

export interface ApplicationRecord {
  id: string;
  customer_id?: string;
  stage: string;
  scoring_category?: string | null;
  scoring_score?: number | null;
  pre_evaluation_min_uf?: number | null;
  pre_evaluation_max_uf?: number | null;
  documents?: DocumentRecord[];
  scoring?: ScoringResult | null;
  initial_proposal_band?: string | null;
  initial_proposal_purpose?: string | null;
  initial_proposal_selected_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AuthUserResponse {
  user?: {
    id: string;
    email: string;
    role?: string;
  };
  customer?: {
    id: string;
    name?: string;
    email?: string;
  };
  application?: ApplicationRecord;
  applications?: ApplicationRecord[];
}

/** Próximo paso sugerido en base al stage actual (mock de Release 1). */
export function nextStepForStage(stage: string): string {
  switch (stage) {
    case "RECEPCIONADA":
      return "Estamos revisando tu solicitud. Pronto calcularemos tu scoring.";
    case "SCORING_COMPLETADO":
      return "Elige tu propuesta inicial (simulación) para poder continuar con la subida de documentos.";
    case "DOCUMENTOS_PENDIENTES":
      return "Sube los documentos solicitados desde la sección Documentos.";
    case "DOCUMENTOS_APROBADOS":
      return "Tus documentos fueron aprobados. Preparando tu pre-evaluación financiera.";
    case "PRE_EVALUACION_COMPLETADA":
      return "Agenda una visita a la propiedad de tu interés con tu asesor.";
    case "VISITA_COMPLETADA":
      return "Tu operación será enviada al banco para evaluación.";
    case "ENVIADO_A_BANCO":
      return "Esperando respuesta del banco. Te avisaremos apenas tengamos novedades.";
    case "ESCRITURACION_AGENDADA":
      return "Prepárate para tu cita de escrituración/notaría.";
    case "CIERRE":
      return "¡Proceso cerrado! Gracias por confiar en nosotros.";
    default:
      return "Estamos procesando tu solicitud.";
  }
}
