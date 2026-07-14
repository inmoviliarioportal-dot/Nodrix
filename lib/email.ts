/**
 * Envío de emails transaccionales propios de la app (notificaciones de
 * cambio de estado, etc.) -- distinto de los emails que Supabase Auth envía
 * por su cuenta (registro, recuperación de contraseña), que usan su propia
 * configuración SMTP interna.
 *
 * En desarrollo local, apunta al mismo servidor Mailpit que ya usa Supabase
 * Auth (puerto SMTP habilitado en supabase/config.toml `[inbucket]
 * smtp_port`), así que los emails se ven en http://127.0.0.1:54324 igual
 * que los de Auth. En producción, configurar SMTP_HOST/PORT/USER/PASS via
 * variables de entorno (cualquier proveedor SMTP real).
 */
import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST || "127.0.0.1";
const SMTP_PORT = Number(process.env.SMTP_PORT) || 54325;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || "Nodrix <notificaciones@nodrix.dev>";

let cachedTransporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;
  cachedTransporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: false,
    auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    // Mailpit local no soporta STARTTLS -- sin esto, nodemailer intenta
    // igualmente negociarlo y falla la conexión en dev.
    ignoreTLS: !SMTP_USER,
  });
  return cachedTransporter;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

/**
 * Envía un email. Best-effort: nunca lanza -- una notificación fallida no
 * debe romper el flujo principal (cambio de estado, etc.) que la disparó.
 * Devuelve `true`/`false` según si el envío fue exitoso, para logging.
 */
export async function sendEmail({ to, subject, html }: SendEmailInput): Promise<boolean> {
  try {
    await getTransporter().sendMail({ from: EMAIL_FROM, to, subject, html });
    return true;
  } catch (err) {
    console.error("[email] failed to send:", err);
    return false;
  }
}
