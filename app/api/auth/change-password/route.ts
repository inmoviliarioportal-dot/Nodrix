import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase";
import { apiError, requireAuth, withErrorHandling, HTTP_STATUS } from "@/app/api/_shared";

type ChangePasswordBody = {
  currentPassword?: string;
  newPassword?: string;
};

/**
 * POST /api/auth/change-password
 *
 * Body: { currentPassword, newPassword }
 *
 * Verifica `currentPassword` re-autenticando contra Supabase Auth (mismo
 * patrón que POST /api/auth/login, con un cliente anon efímero para no
 * pisar la sesión real de la request) antes de aplicar `newPassword` vía
 * `auth.updateUser` sobre la sesión actual — así evitamos que cualquiera
 * con una sesión abierta pueda cambiar la contraseña sin conocer la
 * anterior.
 */
export const POST = withErrorHandling(async (request: Request) => {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  const body = (await request.json().catch(() => null)) as ChangePasswordBody | null;
  if (!body?.currentPassword || !body?.newPassword) {
    return apiError(
      "currentPassword y newPassword son requeridos",
      HTTP_STATUS.BAD_REQUEST,
      "INVALID_BODY"
    );
  }
  if (body.newPassword.length < 8) {
    return apiError(
      "La nueva contraseña debe tener al menos 8 caracteres",
      HTTP_STATUS.BAD_REQUEST,
      "PASSWORD_TOO_SHORT"
    );
  }

  const email = auth.user.email;
  if (!email) {
    return apiError("El usuario no tiene email asociado", HTTP_STATUS.BAD_REQUEST, "NO_EMAIL");
  }

  const verifyClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { error: verifyError } = await verifyClient.auth.signInWithPassword({
    email,
    password: body.currentPassword,
  });

  if (verifyError) {
    return apiError("La contraseña actual es incorrecta", HTTP_STATUS.UNAUTHORIZED, "INVALID_CURRENT_PASSWORD");
  }

  const supabase = await createSupabaseServerClient();
  const { error: updateError } = await supabase.auth.updateUser({ password: body.newPassword });

  if (updateError) {
    return apiError(updateError.message, HTTP_STATUS.INTERNAL_SERVER_ERROR, "PASSWORD_UPDATE_FAILED");
  }

  return NextResponse.json({ success: true });
});
