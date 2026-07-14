import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase";
import { requireAuth, withErrorHandling, apiError, HTTP_STATUS, getUserRole } from "@/app/api/_shared";
import { MVP_ORG_ID } from "../_constants";

/**
 * GET /api/auth/user
 *
 * Returns the currently authenticated user plus its associated `customers`
 * row. `customers` has no `user_id` column linking it to Supabase Auth (see
 * `database/schema.sql`), so the match is done by `(org_id, email)` — the
 * same email used at sign-up/sign-in.
 */
export const GET = withErrorHandling(async () => {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  const { user } = auth;
  const role = await getUserRole(user.id);

  const serviceRoleClient = createSupabaseServiceRoleClient() as any;
  const { data: customer, error: customerError } = await serviceRoleClient
    .from("customers")
    .select()
    .eq("org_id", MVP_ORG_ID)
    .eq("email", user.email)
    .maybeSingle();

  if (customerError) {
    return apiError(
      customerError.message,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "CUSTOMER_FETCH_FAILED"
    );
  }

  return NextResponse.json({ user, customer: customer ?? null, role });
});
