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
/**
 * Orden de despliegue de la línea de tiempo que ve el CLIENTE (distinto del
 * orden real de `APPLICATION_STAGES`, que sigue rigiendo el backend/gating
 * de documentos, transiciones automáticas, etc. -- no lo toques). Cambios
 * pedidos: se oculta "Aprobado previo" (sigue existiendo como stage real,
 * solo no se muestra en esta timeline), y "Visita a la propiedad" se
 * muestra antes que "Documentación", ya que ambos pasos pueden avanzar en
 * paralelo en la práctica. Esto es puramente visual: si el cliente todavía
 * no tuvo su visita real, ese paso puede aparecer "completado" antes de
 * tiempo si su `stage` real ya avanzó más allá en el orden de backend --
 * aceptado como trade-off pedido explícitamente por el negocio.
 */
export const CLIENT_TIMELINE_STAGES: ApplicationStage[] = [
  "RECEPCIONADA",
  "SCORING_COMPLETADO",
  "DOCUMENTOS_PENDIENTES",
  "DOCUMENTOS_APROBADOS",
  "ENVIADO_A_BANCO",
  "ESCRITURACION_AGENDADA",
  "CIERRE",
];

export const STAGE_MARKETING_LABELS: Record<string, string> = {
  RECEPCIONADA: "Revisión inicial",
  SCORING_COMPLETADO: "Análisis de perfil",
  // Un solo paso visual para el cliente: agendar/hacer la visita a la
  // propiedad y subir documentos ocurren EN PARALELO en la práctica (no hay
  // que esperar una etapa para avanzar en la otra), así que se muestran
  // como un único estado en vez de dos pasos separados -- ver
  // `mapStageForClientTimeline` más abajo, que colapsa VISITA_COMPLETADA
  // sobre este mismo paso para el cálculo de progreso/resaltado.
  DOCUMENTOS_PENDIENTES: "Documentación y visita",
  DOCUMENTOS_APROBADOS: "Documentos aprobados",
  PRE_EVALUACION_COMPLETADA: "Aprobado previo",
  VISITA_COMPLETADA: "Documentación y visita",
  ENVIADO_A_BANCO: "Financiamiento",
  ESCRITURACION_AGENDADA: "Escrituración",
  CIERRE: "Cierre",
};

/** Traduce el `stage` real (backend, sin tocar) al valor que debe usarse
 * para resaltar/calcular progreso en la timeline del cliente, donde
 * VISITA_COMPLETADA y DOCUMENTOS_PENDIENTES se muestran como un solo paso
 * ("Documentación y visita"). El resto de la máquina de estados (gating de
 * documentos, transiciones automáticas, etc.) sigue usando el stage real. */
export function mapStageForClientTimeline(stage: ApplicationStage): ApplicationStage {
  return stage === "VISITA_COMPLETADA" ? "DOCUMENTOS_PENDIENTES" : stage;
}

/**
 * Mapea cada uno de los 9 stages reales de backend al índice (0-6) del paso
 * visual que le corresponde en `CLIENT_TIMELINE_STAGES` -- fuente única para
 * CUALQUIER vista que agrupe/cuente por "el mismo paso que ve el cliente"
 * (funnel de KPIs, "Solicitudes en curso por estado" del admin, etc.), así
 * el sistema entero usa 7 pasos consistentes en vez de 9.
 *
 * VISITA_COMPLETADA cae en el mismo bucket que DOCUMENTOS_PENDIENTES (mismo
 * criterio que `mapStageForClientTimeline`). PRE_EVALUACION_COMPLETADA no
 * tiene paso visual propio (oculto, "Aprobado previo") -- cae en el mismo
 * bucket que DOCUMENTOS_APROBADOS porque ya lo superó, hasta que la
 * solicitud avance a ENVIADO_A_BANCO.
 */
export const BACKEND_STAGE_TO_CLIENT_BUCKET: Record<ApplicationStage, number> = {
  RECEPCIONADA: 0,
  SCORING_COMPLETADO: 1,
  DOCUMENTOS_PENDIENTES: 2,
  VISITA_COMPLETADA: 2,
  DOCUMENTOS_APROBADOS: 3,
  PRE_EVALUACION_COMPLETADA: 3,
  ENVIADO_A_BANCO: 4,
  ESCRITURACION_AGENDADA: 5,
  CIERRE: 6,
};

/** Inverso de `BACKEND_STAGE_TO_CLIENT_BUCKET`: para cada paso visual (clave
 * = valor en `CLIENT_TIMELINE_STAGES`), la lista de stages reales de backend
 * que agrupa -- usado para el drilldown hacia /backoffice/queue, que debe
 * filtrar por TODOS los stages reales del bucket, no solo uno. */
export const CLIENT_BUCKET_BACKEND_STAGES: Record<string, ApplicationStage[]> = CLIENT_TIMELINE_STAGES.reduce(
  (acc, bucketStage) => {
    const bucketIndex = BACKEND_STAGE_TO_CLIENT_BUCKET[bucketStage];
    acc[bucketStage] = APPLICATION_STAGES.filter((s) => BACKEND_STAGE_TO_CLIENT_BUCKET[s] === bucketIndex);
    return acc;
  },
  {} as Record<string, ApplicationStage[]>
);

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
  /** Fuentes de ingreso declaradas en el wizard (Paso 1) -- determina qué
   * grupos de documentos se piden en la Bóveda documental, ver
   * lib/document-requirements.ts. */
  income_sources?: unknown;
  /** Asesor asignado a la solicitud (solo nombre, ver GET /api/applications/[id]) --
   * usado en la burbuja de WhatsApp del dashboard para mostrar a quién
   * contactar por nombre y apellido. */
  assigned_advisor?: { full_name: string | null; phone: string | null } | null;
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
