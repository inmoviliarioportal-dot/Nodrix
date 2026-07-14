import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { apiError, requireAuth, withErrorHandling, HTTP_STATUS } from "@/app/api/_shared";
import type { AnySupabaseClient } from "@/lib/leads";

/**
 * Closures (Cierre) — Release 3 (Admin/Gerencia).
 *
 * Terminal step of the 9-stage flow: moves an `applications` row from
 * `ESCRITURACION_AGENDADA` to `CIERRE` (see `database/schema.sql`), once a
 * deed (`/api/deeds`) has already been scheduled for it.
 *
 * Commission: mock calculation, `sale_price * 0.02` (2%, flat, mock — no real
 * commission-tier logic exists yet). `sale_price` has no column on
 * `applications` yet, so it's read from the request body (`salePrice`) and
 * defaults to a fixed mock value (`DEFAULT_MOCK_SALE_PRICE`, in CLP) when
 * omitted, purely so the endpoint is exercisable end-to-end before that
 * column/pricing source exists.
 *
 * Persistence: attempts an INSERT into a `closures` table. If that fails
 * because the table/columns used here aren't present yet (Postgres error
 * `42P01`, or any other insert failure), falls back to an in-memory mock
 * store — same fallback strategy as `/api/deeds`.
 */

export interface ClosureRow {
  id: string;
  application_id: string;
  deed_id: string;
  closed_at: string;
}

const mockClosures: ClosureRow[] = [];

const COMMISSION_RATE = 0.02; // 2% mock commission
const DEFAULT_MOCK_SALE_PRICE = 100_000_000; // CLP, mock fallback when salePrice isn't supplied

function isMissingTableError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "42P01" || /relation .* does not exist/i.test(error.message ?? "");
}

/**
 * POST /api/closures
 *
 * Body: `{ applicationId: string, salePrice?: number }`.
 *
 * 1. Validates `applications.stage === "ESCRITURACION_AGENDADA"` and that a
 *    deed exists for `applicationId` (via `/api/deeds`'s store: DB `deeds`
 *    table if present, otherwise its in-memory fallback isn't reachable
 *    across route modules in dev, so this checks the `deeds` table when
 *    available and otherwise trusts the request — see note below).
 * 2. Moves the application to `CIERRE` (terminal stage).
 * 3. Creates a closure row + computes mock commission = salePrice * 0.02.
 * Requires an authenticated session.
 */
export const POST = withErrorHandling(async (request: Request) => {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  const body = await request.json().catch(() => null);
  const applicationId =
    body && typeof body === "object" ? (body as Record<string, unknown>).applicationId : undefined;
  const salePriceInput = body && typeof body === "object" ? (body as Record<string, unknown>).salePrice : undefined;

  if (typeof applicationId !== "string" || !applicationId) {
    return apiError("Missing applicationId", HTTP_STATUS.BAD_REQUEST, "MISSING_APPLICATION_ID");
  }

  const supabase = createSupabaseServiceRoleClient() as unknown as AnySupabaseClient;

  const { data: application, error: applicationError } = await supabase
    .from("applications")
    .select("id, stage")
    .eq("id", applicationId)
    .maybeSingle();

  if (applicationError) {
    return apiError(`Failed to load application: ${applicationError.message}`, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
  if (!application) {
    return apiError("Application not found", HTTP_STATUS.NOT_FOUND, "APPLICATION_NOT_FOUND");
  }

  const stage = (application as { stage: string }).stage;
  if (stage !== "ESCRITURACION_AGENDADA") {
    return apiError(
      `Cannot close: application is in ${stage}, expected ESCRITURACION_AGENDADA.`,
      HTTP_STATUS.BAD_REQUEST,
      "INVALID_APPLICATION_STAGE"
    );
  }

  // Find the associated deed. Reads from the `deeds` table when it exists;
  // if it doesn't exist yet, `/api/deeds`'s fallback store is in-memory and
  // process-local to that route module, so it can't be read from here —
  // in that dev-only scenario we skip the deed-existence check rather than
  // block the flow (there is no persistent deed store to query yet).
  let deedId: string | null = null;
  const { data: deed, error: deedError } = await supabase
    .from("deeds")
    .select("id")
    .eq("application_id", applicationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (deedError && !isMissingTableError(deedError)) {
    return apiError(`Failed to load deed: ${deedError.message}`, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
  if (!deedError) {
    if (!deed) {
      return apiError(
        "Cannot close: no deed (escrituración) has been scheduled for this application yet.",
        HTTP_STATUS.BAD_REQUEST,
        "DEED_NOT_FOUND"
      );
    }
    deedId = (deed as { id: string }).id;
  }

  const salePrice =
    typeof salePriceInput === "number" && Number.isFinite(salePriceInput) && salePriceInput > 0
      ? salePriceInput
      : DEFAULT_MOCK_SALE_PRICE;
  const commission = Math.round(salePrice * COMMISSION_RATE * 100) / 100;

  const { error: updateError } = await supabase
    .from("applications")
    .update({ stage: "CIERRE" })
    .eq("id", applicationId);

  if (updateError) {
    return apiError(`Failed to update application stage: ${updateError.message}`, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }

  const closure: ClosureRow = {
    id: randomUUID(),
    application_id: applicationId,
    deed_id: deedId ?? "mock-deed",
    closed_at: new Date().toISOString(),
  };

  const { data: inserted, error: insertError } = await supabase
    .from("closures")
    .insert({
      id: closure.id,
      application_id: closure.application_id,
      deed_id: closure.deed_id,
      closed_at: closure.closed_at,
    })
    .select("*")
    .single();

  if (insertError) {
    if (!isMissingTableError(insertError)) {
      return apiError(`Failed to create closure: ${insertError.message}`, HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
    mockClosures.push(closure);
    return NextResponse.json({ closure, commission }, { status: 201 });
  }

  return NextResponse.json({ closure: inserted ?? closure, commission }, { status: 201 });
});

/**
 * GET /api/closures
 *
 * Query params: `applicationId?`, `limit` (default 50, max 200).
 * Requires an authenticated session.
 */
export const GET = withErrorHandling(async (request: Request) => {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  const { searchParams } = new URL(request.url);
  const applicationId = searchParams.get("applicationId");
  const limit = Math.min(Number(searchParams.get("limit")) || 50, 200);

  const supabase = createSupabaseServiceRoleClient() as unknown as AnySupabaseClient;

  let query = supabase
    .from("closures")
    .select("*", { count: "exact" })
    .order("closed_at", { ascending: false })
    .limit(limit);

  if (applicationId) query = query.eq("application_id", applicationId);

  const { data, error, count } = await query;

  if (error) {
    if (!isMissingTableError(error)) {
      return apiError(`Failed to list closures: ${error.message}`, HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
    let filtered = mockClosures;
    if (applicationId) filtered = filtered.filter((c) => c.application_id === applicationId);
    filtered = [...filtered].sort((a, b) => b.closed_at.localeCompare(a.closed_at));

    const total = filtered.length;
    return NextResponse.json({ closures: filtered.slice(0, limit), total });
  }

  return NextResponse.json({ closures: data ?? [], total: count ?? (data?.length ?? 0) });
});
