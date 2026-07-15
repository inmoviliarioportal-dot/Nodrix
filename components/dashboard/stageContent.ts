import type { ApplicationStage } from "./types"

export type AlertTone = "info" | "success" | "warning"

export interface StageClientContent {
  /** Mensaje contextual mostrado en el banner de alerta del dashboard. */
  alert: { tone: AlertTone; message: string }
  /** Título del video de gancho asociado a la etapa. */
  videoTitle: string
  /**
   * URL real de YouTube/Vimeo para el video de la etapa. Si no está
   * definida, HookVideo.tsx muestra el placeholder mock — reemplazar acá
   * cuando exista contenido real, no hace falta tocar ningún componente.
   */
  videoUrl?: string
  /** Si es `true`, el dashboard muestra un CTA prominente para subir
   * documentos (además de la card de documentos habitual). */
  showUploadCta: boolean
  /** Duración típica de la etapa, para manejar expectativas del cliente
   * (ej. "2-3 días hábiles"). Mock/estimado -- no medido contra datos reales
   * todavía. */
  estimatedDuration: string
}

/**
 * Contenido por etapa para el dashboard del cliente: alertas, video de
 * "gancho", estimador de tiempo, y si corresponde habilitar la subida de
 * documentos en este punto del proceso.
 */
export const STAGE_CLIENT_CONTENT: Record<ApplicationStage, StageClientContent> = {
  RECEPCIONADA: {
    alert: {
      tone: "info",
      message: "Recibimos tu solicitud. Estamos analizando tu perfil financiero.",
    },
    videoTitle: "Bienvenido a Nodrix: así funciona tu proceso de inversión",
    showUploadCta: false,
    estimatedDuration: "Menos de 1 día",
  },
  SCORING_COMPLETADO: {
    alert: {
      tone: "success",
      message: "¡Tu análisis de perfil está listo! Elige tu propuesta inicial antes de subir documentos.",
    },
    videoTitle: "Cómo interpretar tu categoría de scoring",
    showUploadCta: false,
    estimatedDuration: "Inmediato",
  },
  DOCUMENTOS_PENDIENTES: {
    alert: {
      tone: "warning",
      message: "Necesitamos que subas tus documentos para continuar con tu solicitud.",
    },
    videoTitle: "Qué documentos necesitas y por qué",
    showUploadCta: true,
    estimatedDuration: "Depende de ti — mientras antes subas, antes avanzamos",
  },
  DOCUMENTOS_APROBADOS: {
    alert: {
      tone: "success",
      message: "Tus documentos fueron aprobados. Estamos calculando tu pre-evaluación.",
    },
    videoTitle: "Qué sigue después de aprobar tus documentos",
    showUploadCta: false,
    estimatedDuration: "1-2 días hábiles",
  },
  PRE_EVALUACION_COMPLETADA: {
    alert: {
      tone: "success",
      message: "Tu pre-evaluación está lista. Coordina una visita con tu asesor.",
    },
    videoTitle: "Tu rango de inversión pre-aprobado, explicado",
    showUploadCta: false,
    estimatedDuration: "2-3 días hábiles",
  },
  VISITA_COMPLETADA: {
    alert: {
      tone: "info",
      message: "Registramos tu visita. Tu solicitud avanzará al banco pronto.",
    },
    videoTitle: "Qué revisamos durante la visita a la propiedad",
    showUploadCta: false,
    estimatedDuration: "3-5 días hábiles",
  },
  ENVIADO_A_BANCO: {
    alert: {
      tone: "info",
      message: "Tu solicitud fue enviada a evaluación bancaria.",
    },
    videoTitle: "Cómo es el proceso de evaluación bancaria",
    showUploadCta: false,
    estimatedDuration: "5-10 días hábiles",
  },
  ESCRITURACION_AGENDADA: {
    alert: {
      tone: "success",
      message: "¡Tu escrituración fue agendada! Ya casi terminamos.",
    },
    videoTitle: "Qué esperar el día de la firma de escritura",
    showUploadCta: false,
    estimatedDuration: "Según la fecha agendada con la notaría",
  },
  CIERRE: {
    alert: {
      tone: "success",
      message: "¡Felicitaciones! Tu proceso de inversión se completó con éxito.",
    },
    videoTitle: "Bienvenido como inversionista Nodrix",
    showUploadCta: false,
    estimatedDuration: "Completado",
  },
}
