import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase";
import { apiError, HTTP_STATUS } from "./errors";

/**
 * Result of an auth guard check: either an authenticated user + ready
 * Supabase client, or a Response to return immediately.
 */
export type AuthResult =
  | { authorized: true; user: User; supabase: Awaited<ReturnType<typeof createSupabaseServerClient>> }
  | { authorized: false; response: Response };

/**
 * Verifies there is a logged-in Supabase session for the current request.
 * Use at the top of any protected Route Handler:
 *
 *   export async function GET(request: Request) {
 *     const auth = await requireAuth();
 *     if (!auth.authorized) return auth.response;
 *     const { user, supabase } = auth;
 *     ...
 *   }
 *
 * Note: this checks `auth.getUser()` (validates the JWT against Supabase
 * Auth server), not just `getSession()` (which only reads the cookie) —
 * per Supabase's guidance, `getUser()` is required for trusting the
 * identity server-side.
 */
export async function requireAuth(): Promise<AuthResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      authorized: false,
      response: apiError("Not authenticated", HTTP_STATUS.UNAUTHORIZED, "UNAUTHENTICATED"),
    };
  }

  return { authorized: true, user, supabase };
}
