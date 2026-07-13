import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase";
import { apiError, withErrorHandling, HTTP_STATUS } from "@/app/api/_shared";

/**
 * POST /api/auth/logout
 *
 * Signs out the current session. The SSR client clears the session cookies
 * on the response automatically.
 */
export const POST = withErrorHandling(async () => {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    return apiError(error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR, "LOGOUT_FAILED");
  }

  return NextResponse.json({ success: true });
});
