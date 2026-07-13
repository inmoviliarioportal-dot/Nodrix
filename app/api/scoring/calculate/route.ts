import { NextResponse } from "next/server";
import { requireAuth } from "@/app/api/_shared";
import { apiError, withErrorHandling, HTTP_STATUS } from "@/app/api/_shared";
import { createSupabaseServiceRoleClient } from "@/lib/supabase";
import {
  calculateScoring,
  loadActiveScoringConfig,
  type CustomerFinancialProfile,
} from "@/lib/scoring";

/** Fixed org_id used across the MVP (single-tenant, multi-tenant-ready schema). */
const DEFAULT_ORG_ID = "00000000-0000-0000-0000-000000000001";

const EMPLOYMENT_TYPES = ["indefinido", "plazo_fijo", "honorarios", "independiente"] as const;

function isValidProfile(value: unknown): value is CustomerFinancialProfile {
  if (!value || typeof value !== "object") return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.monthlySalary === "number" &&
    typeof p.savingsAmount === "number" &&
    typeof p.employmentType === "string" &&
    (EMPLOYMENT_TYPES as readonly string[]).includes(p.employmentType) &&
    typeof p.employmentYears === "number" &&
    typeof p.hasExistingDebt === "boolean" &&
    typeof p.monthlyDebtPayments === "number"
  );
}

/**
 * POST /api/scoring/calculate
 *
 * On-demand scoring recalculation (e.g. an advisor recalculating after new
 * financial info comes in). Wraps `loadActiveScoringConfig` +
 * `calculateScoring` from `lib/scoring.ts` and persists the result onto the
 * corresponding `applications` row.
 *
 * Body: `{ applicationId: string, financialProfile: CustomerFinancialProfile }`.
 *
 * Response 200: the full `ScoringResult` (`score`, `category`, `explanation`,
 * `factorsApplied`, `rulesVersion`) — useful to show directly in the client
 * dashboard.
 */
export const POST = withErrorHandling(async (request: Request) => {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  const body = await request.json().catch(() => null);
  const applicationId = body?.applicationId;
  const financialProfile = body?.financialProfile;

  if (typeof applicationId !== "string" || applicationId.length === 0) {
    return apiError(
      "Missing or invalid 'applicationId'",
      HTTP_STATUS.BAD_REQUEST,
      "MISSING_APPLICATION_ID"
    );
  }
  if (!isValidProfile(financialProfile)) {
    return apiError(
      "Missing or invalid 'financialProfile'",
      HTTP_STATUS.BAD_REQUEST,
      "INVALID_FINANCIAL_PROFILE"
    );
  }

  const supabase = createSupabaseServiceRoleClient();

  // NOTE: `lib/supabase/types.ts` is a placeholder pending the DB Architect's
  // generated types (`Tables: Record<string, never>`) — the `as any` casts
  // below are a temporary bridge so this route type-checks meanwhile.
  const { data: application, error: fetchError } = await (supabase.from("applications") as any)
    .select("id")
    .eq("id", applicationId)
    .maybeSingle();

  if (fetchError) {
    return apiError(
      `Failed to load application: ${fetchError.message}`,
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
  if (!application) {
    return apiError("Application not found", HTTP_STATUS.NOT_FOUND, "APPLICATION_NOT_FOUND");
  }

  const config = await loadActiveScoringConfig(DEFAULT_ORG_ID, supabase as any);
  const result = calculateScoring(financialProfile, config);

  const { error: updateError } = await (supabase.from("applications") as any)
    .update({
      scoring_category: result.category,
      scoring_score: result.score,
    })
    .eq("id", applicationId);

  if (updateError) {
    return apiError(
      `Failed to persist scoring result: ${updateError.message}`,
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }

  return NextResponse.json(result);
});
