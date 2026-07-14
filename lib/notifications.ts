/**
 * Notificaciones por email al cliente cuando cambia el estado de su
 * solicitud -- antes solo se enteraba si entraba al dashboard. Best-effort:
 * nunca bloquea ni revierte el cambio de estado que la disparó si falla
 * (ver `sendEmail`).
 */
import { sendEmail } from "@/lib/email";
import type { AnySupabaseClient, ApplicationStage } from "@/lib/leads";

/** Copy de marketing por etapa para el email (independiente de
 * `components/dashboard/types.ts` para no acoplar este módulo de servidor a
 * un archivo de la capa de presentación). */
const STAGE_EMAIL_CONTENT: Record<ApplicationStage, { subject: string; body: string }> = {
  RECEPCIONADA: {
    subject: "Recibimos tu solicitud",
    body: "Hemos recibido tu solicitud y estamos analizando tu perfil financiero.",
  },
  SCORING_COMPLETADO: {
    subject: "Tu análisis de perfil está listo",
    body: "Ya calculamos tu categoría de inversión. Ingresa a tu portal para verla.",
  },
  DOCUMENTOS_PENDIENTES: {
    subject: "Necesitamos tus documentos",
    body: "Para continuar con tu solicitud, necesitamos que subas tus documentos desde tu portal.",
  },
  DOCUMENTOS_APROBADOS: {
    subject: "Tus documentos fueron aprobados",
    body: "¡Buenas noticias! Tus documentos fueron aprobados y estamos calculando tu pre-evaluación.",
  },
  PRE_EVALUACION_COMPLETADA: {
    subject: "Tu pre-evaluación está lista",
    body: "Ya tenemos tu rango de inversión pre-aprobado. Tu asesor te contactará para coordinar una visita.",
  },
  VISITA_COMPLETADA: {
    subject: "Registramos tu visita",
    body: "Tu solicitud avanzará pronto a evaluación bancaria.",
  },
  ENVIADO_A_BANCO: {
    subject: "Tu solicitud fue enviada al banco",
    body: "Tu solicitud está en evaluación bancaria.",
  },
  ESCRITURACION_AGENDADA: {
    subject: "Tu escrituración fue agendada",
    body: "¡Ya casi terminamos! Tu cita de escrituración fue agendada.",
  },
  CIERRE: {
    subject: "¡Tu proceso se completó!",
    body: "Felicitaciones, tu proceso de inversión se completó con éxito.",
  },
};

function buildEmailHtml(customerName: string, body: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
      <h2 style="color: #0f172a;">Hola ${customerName || ""},</h2>
      <p>${body}</p>
      <p style="margin-top: 24px;">
        <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/dashboard"
           style="background: #22d3ee; color: #05060a; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Ver mi solicitud
        </a>
      </p>
      <p style="color: #6b7280; font-size: 12px; margin-top: 32px;">Nodrix — Plataforma Inmobiliaria Inteligente</p>
    </div>
  `;
}

/**
 * Notifica al cliente dueño de `applicationId` que su solicitud avanzó a
 * `newStage`. Busca el customer (email/nombre) internamente vía
 * `applications.customer_id` -- los call sites solo necesitan pasar el
 * cliente Supabase, el id de la application y el nuevo estado.
 */
export async function notifyStageChange(
  supabase: AnySupabaseClient,
  applicationId: string,
  newStage: ApplicationStage
): Promise<void> {
  try {
    const { data: application } = await (supabase.from("applications") as any)
      .select("customer_id")
      .eq("id", applicationId)
      .maybeSingle();
    if (!application?.customer_id) return;

    const { data: customer } = await (supabase.from("customers") as any)
      .select("name, email")
      .eq("id", application.customer_id)
      .maybeSingle();
    if (!customer?.email) return;

    const content = STAGE_EMAIL_CONTENT[newStage];
    if (!content) return;

    await sendEmail({
      to: customer.email,
      subject: content.subject,
      html: buildEmailHtml(customer.name ?? "", content.body),
    });
  } catch (err) {
    // Best-effort: una notificación fallida no debe afectar el cambio de
    // estado que la disparó.
    console.error("[notifications] failed to notify stage change:", err);
  }
}
