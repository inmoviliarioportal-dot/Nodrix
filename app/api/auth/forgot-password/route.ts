import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase";
import { apiError, withErrorHandling, HTTP_STATUS } from "@/app/api/_shared";

type ForgotPasswordBody = {
  email?: string;
};

/**
 * POST /api/auth/forgot-password
 *
 * Body: { email }
 *
 * Dispara el email de recuperación de contraseña de Supabase Auth
 * (`resetPasswordForEmail`) — en local se ve en Inbucket
 * (http://127.0.0.1:54324), en producción requiere SMTP configurado en el
 * proyecto de Supabase (ver supabase/config.toml `[auth.email.smtp]`).
 *
 * Siempre responde 200 exista o no el email (no revela si una cuenta
 * existe, práctica estándar contra enumeración de usuarios).
 */
export const POST = withErrorHandling(async (request: Request) => {
  const body = (await request.json().catch(() => null)) as ForgotPasswordBody | null;
  if (!body?.email) {
    return apiError("email es requerido", HTTP_STATUS.BAD_REQUEST, "INVALID_BODY");
  }

  const origin = request.headers.get("origin") ?? new URL(request.url).origin;

  const supabase = await createSupabaseServerClient();
  await supabase.auth.resetPasswordForEmail(body.email, {
    redirectTo: `${origin}/auth/reset-password`,
  });

  // No se distingue error real de "email no existe" en la respuesta al
  // cliente -- ver nota arriba.
  return NextResponse.json({ success: true });
});
