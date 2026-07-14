import type { ApplicationStage } from "./types"

export type AlertTone = "info" | "success" | "warning"

export interface StageClientContent {
  /** Mensaje contextual mostrado en el banner de alerta del dashboard. */
  alert: { tone: AlertTone; message: string }
  /** Título del video de gancho asociado a la etapa (contenido mock por ahora
   * — reemplazar por URLs reales cuando estén disponibles). */
  videoTitle: string
  /** Si es `true`, el dashboard muestra un CTA prominente para subir
   * documentos (además de la card de documentos habitual). */
  showUploadCta: boolean
}

/**
 * Contenido por etapa para el dashboard del cliente: alertas, video de
 * "gancho" y si corresponde habilitar la subida de documentos en este punto
 * del proceso. Contenido de video es mock/placeholder (ver HookVideo.tsx) —
 * pendiente de URLs reales por etapa.
 */
export const STAGE_CLIENT_CONTENT: Record<ApplicationStage, StageClientContent> = {
  RECEPCIONADA: {
    alert: {
      tone: "info",
      message: "Recibimos tu solicitud. Estamos analizando tu perfil financiero.",
    },
    videoTitle: "Bienvenido a Nodrix: así funciona tu proceso de inversión",
    showUploadCta: false,
  },
  SCORING_COMPLETADO: {
    alert: {
      tone: "success",
      message: "¡Tu análisis de perfil está listo! Revisa tu categoría de inversión.",
    },
    videoTitle: "Cómo interpretar tu categoría de scoring",
    showUploadCta: false,
  },
  DOCUMENTOS_PENDIENTES: {
    alert: {
      tone: "warning",
      message: "Necesitamos que subas tus documentos para continuar con tu solicitud.",
    },
    videoTitle: "Qué documentos necesitas y por qué",
    showUploadCta: true,
  },
  DOCUMENTOS_APROBADOS: {
    alert: {
      tone: "success",
      message: "Tus documentos fueron aprobados. Estamos calculando tu pre-evaluación.",
    },
    videoTitle: "Qué sigue después de aprobar tus documentos",
    showUploadCta: false,
  },
  PRE_EVALUACION_COMPLETADA: {
    alert: {
      tone: "success",
      message: "Tu pre-evaluación está lista. Coordina una visita con tu asesor.",
    },
    videoTitle: "Tu rango de inversión pre-aprobado, explicado",
    showUploadCta: false,
  },
  VISITA_COMPLETADA: {
    alert: {
      tone: "info",
      message: "Registramos tu visita. Tu solicitud avanzará al banco pronto.",
    },
    videoTitle: "Qué revisamos durante la visita a la propiedad",
    showUploadCta: false,
  },
  ENVIADO_A_BANCO: {
    alert: {
      tone: "info",
      message: "Tu solicitud fue enviada a evaluación bancaria.",
    },
    videoTitle: "Cómo es el proceso de evaluación bancaria",
    showUploadCta: false,
  },
  ESCRITURACION_AGENDADA: {
    alert: {
      tone: "success",
      message: "¡Tu escrituración fue agendada! Ya casi terminamos.",
    },
    videoTitle: "Qué esperar el día de la firma de escritura",
    showUploadCta: false,
  },
  CIERRE: {
    alert: {
      tone: "success",
      message: "¡Felicitaciones! Tu proceso de inversión se completó con éxito.",
    },
    videoTitle: "Bienvenido como inversionista Nodrix",
    showUploadCta: false,
  },
}
