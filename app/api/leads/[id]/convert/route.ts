import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { apiError, requireAuth, withErrorHandling, HTTP_STATUS } from "@/app/api/_shared";
import { MVP_ORG_ID } from "@/app/api/auth/_constants";
import { maybeApplyScoring } from "@/app/api/leads/route";
import type { AnySupabaseClient } from "@/lib/leads";

/**
 * POST /api/leads/[id]/convert
 *
 * `[id]` is the `customers.id` (lead) to convert. Creates a NEW application
 * for that existing customer in stage `RECEPCIONADA` — used when an
 * existing lead starts a new process (e.g. a second property/application),
 * or an advisor manually converts a lead that was captured without one.
 *
 * Body (optional financial profile — same shape/contract as `POST /api/leads`):
 * ```
 * {
 *   monthlySalary?: number,
 *   savingsAmount?: number,
 *   employmentType?: "indefinido" | "plazo_fijo" | "honorarios" | "independiente",
 *   employmentYears?: number,
 *   hasExistingDebt?: boolean,
 *   monthlyDebtPayments?: number,
 * }
 * ```
 * If ALL financial fields are present, `calculateScoring()` runs immediately
 * (same trigger rule as `POST /api/leads`) and the new application is saved
 * with `scoring_category`/`scoring_score` set and stage `SCORING_COMPLETADO`.
 * Requires an authenticated session (advisor/internal action).
 */
export const POST = withErrorHandling(async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  const { id } = await context.params;
  if (!id) {
    return apiError("Missing lead id", HTTP_STATUS.BAD_REQUEST, "MISSING_ID");
  }

  const body = await request.json().catch(() => ({}));
  const financial = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;

  const supabase = createSupabaseServiceRoleClient() as unknown as AnySupabaseClient;

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .eq("org_id", MVP_ORG_ID)
    .maybeSingle();

  if (customerError) {
    return apiError(`Failed to look up lead: ${customerError.message}`, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
  if (!customer) {
    return apiError("Lead not found", HTTP_STATUS.NOT_FOUND, "LEAD_NOT_FOUND");
  }

  const { data: application, error: applicationError } = await supabase
    .from("applications")
    .insert({
      org_id: MVP_ORG_ID,
      customer_id: id,
    })
    .select("*")
    .single();

  if (applicationError || !application) {
    return apiError(
      `Failed to create application: ${applicationError?.message ?? "unknown error"}`,
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }

  const scoredApplication = await maybeApplyScoring(
    supabase,
    application as { id: string; stage: string },
    financial
  );

  return NextResponse.json(
    { customer, application: scoredApplication ?? application },
    { status: 201 }
  );
});
