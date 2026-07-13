import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { apiError, requireAuth, withErrorHandling, HTTP_STATUS } from "@/app/api/_shared";
import { MVP_ORG_ID } from "@/app/api/auth/_constants";
import { APPLICATION_STAGES, isValidStage, type AnySupabaseClient } from "@/lib/leads";

/**
 * GET /api/applications
 *
 * Lists applications for the fixed MVP org, most recent first.
 * Query params:
 *   - `stage`: filter by exact stage (must be one of `APPLICATION_STAGES`).
 *   - `customer_id`: filter by customer.
 *   - `limit`: default 50, max 200.
 * Requires an authenticated session (internal/advisor use).
 */
export const GET = withErrorHandling(async (request: Request) => {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  const { searchParams } = new URL(request.url);
  const stage = searchParams.get("stage");
  const customerId = searchParams.get("customer_id");
  const limit = Math.min(Number(searchParams.get("limit")) || 50, 200);

  if (stage && !isValidStage(stage)) {
    return apiError(
      `Invalid stage. Must be one of: ${APPLICATION_STAGES.join(", ")}`,
      HTTP_STATUS.BAD_REQUEST,
      "INVALID_STAGE"
    );
  }

  const supabase = createSupabaseServiceRoleClient() as unknown as AnySupabaseClient;
  let query = supabase
    .from("applications")
    .select("*")
    .eq("org_id", MVP_ORG_ID)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (stage) query = query.eq("stage", stage);
  if (customerId) query = query.eq("customer_id", customerId);

  const { data, error } = await query;
  if (error) {
    return apiError(`Failed to list applications: ${error.message}`, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }

  return NextResponse.json({ applications: data ?? [] });
});
