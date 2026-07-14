import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase";
import { apiError, withErrorHandling, HTTP_STATUS, getUserRole } from "@/app/api/_shared";

type LoginBody = {
  email?: string;
  password?: string;
};

/**
 * POST /api/auth/login
 * Body: { email, password }
 *
 * Signs in via Supabase Auth. The SSR client writes the session cookies to
 * the response automatically (see `lib/supabase/server.ts`), so the browser
 * ends up authenticated without any extra work on the client side.
 */
export const POST = withErrorHandling(async (request: Request) => {
  const body = (await request.json().catch(() => null)) as LoginBody | null;

  if (!body?.email || !body?.password) {
    return apiError(
      "email y password son requeridos",
      HTTP_STATUS.BAD_REQUEST,
      "INVALID_BODY"
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: body.email,
    password: body.password,
  });

  if (error) {
    return apiError(error.message, HTTP_STATUS.UNAUTHORIZED, "LOGIN_FAILED");
  }

  const role = data.user ? await getUserRole(data.user.id) : "cliente";

  return NextResponse.json({ user: data.user, session: data.session, role });
});
