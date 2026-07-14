import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { apiError, requireAuth, withErrorHandling, HTTP_STATUS } from "@/app/api/_shared";
import type { AnySupabaseClient } from "@/lib/leads";

/**
 * Deeds (Escrituración) — Release 3 (Admin/Gerencia).
 *
 * Represents scheduling the notary appointment that precedes the terminal
 * CIERRE stage. An `applications` row must be in `ESCRITURACION_AGENDADA`
 * (stage 8 of 9 — see `database/schema.sql`) before a deed can be created;
 * that is the last stage before the closure endpoint (`/api/closures`) can
 * move the application to `CIERRE`.
 *
 * Persistence: attempts an INSERT into a `deeds` table. If that table
 * doesn't exist yet in the deployed schema (Postgres error `42P01`, or any
 * other insert failure), falls back to an in-memory mock store so this
 * endpoint stays usable ahead of a dedicated migration. The in-memory store
 * is per server-process (not shared across serverless instances) — it exists
 * purely as a development fallback, not a production data store.
 */

export interface DeedRow {
  id: string;
  application_id: string;
  notary_id: string;
  status: "AGENDADA" | "REALIZADA" | "CANCELADA";
  scheduled_date: string | null;
  created_at: string;
}

// In-memory fallback store, used only if the `deeds` table isn't present.
const mockDeeds: DeedRow[] = [];

const MOCK_NOTARY_ID = "mock-notary-001";

function isMissingTableError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "42P01" || /relation .* does not exist/i.test(error.message ?? "");
}

/**
 * POST /api/deeds
 *
 * Body: `{ applicationId: string, notaryId?: string, scheduledDate?: string }`.
 *
 * 1. Validates `applications.stage === "ESCRITURACION_AGENDADA"` for the
 *    given `applicationId` (the only stage a deed may be scheduled from).
 * 2. Creates a deed with `status: "AGENDADA"`.
 * 3. Persists to the `deeds` table if it exists, otherwise to an in-memory
 *    mock store.
 * Requires an authenticated session (internal/advisor-gerencia use).
 */
export const POST = withErrorHandling(async (request: Request) => {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  const body = await request.json().catch(() => null);
  const applicationId =
    body && typeof body === "object" ? (body as Record<string, unknown>).applicationId : undefined;
  const notaryId = body && typeof body === "object" ? (body as Record<string, unknown>).notaryId : undefined;
  const scheduledDate =
    body && typeof body === "object" ? (body as Record<string, unknown>).scheduledDate : undefined;

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
      `Cannot schedule a deed: application is in ${stage}, expected ESCRITURACION_AGENDADA.`,
      HTTP_STATUS.BAD_REQUEST,
      "INVALID_APPLICATION_STAGE"
    );
  }

  const deed: DeedRow = {
    id: randomUUID(),
    application_id: applicationId,
    notary_id: typeof notaryId === "string" && notaryId ? notaryId : MOCK_NOTARY_ID,
    status: "AGENDADA",
    scheduled_date: typeof scheduledDate === "string" && scheduledDate ? scheduledDate : null,
    created_at: new Date().toISOString(),
  };

  const { data: inserted, error: insertError } = await supabase
    .from("deeds")
    .insert({
      id: deed.id,
      application_id: deed.application_id,
      notary_id: deed.notary_id,
      status: deed.status,
      scheduled_date: deed.scheduled_date,
      created_at: deed.created_at,
    })
    .select("*")
    .single();

  if (insertError) {
    if (!isMissingTableError(insertError)) {
      return apiError(`Failed to create deed: ${insertError.message}`, HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
    // `deeds` table not present yet — fall back to in-memory mock.
    mockDeeds.push(deed);
    return NextResponse.json({ deed }, { status: 201 });
  }

  return NextResponse.json({ deed: inserted ?? deed }, { status: 201 });
});

/**
 * GET /api/deeds
 *
 * Query params: `applicationId?`, `status?`, `limit` (default 50, max 200),
 * `offset` (default 0).
 * Requires an authenticated session.
 */
export const GET = withErrorHandling(async (request: Request) => {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  const { searchParams } = new URL(request.url);
  const applicationId = searchParams.get("applicationId");
  const status = searchParams.get("status");
  const limit = Math.min(Number(searchParams.get("limit")) || 50, 200);
  const offset = Math.max(Number(searchParams.get("offset")) || 0, 0);

  const supabase = createSupabaseServiceRoleClient() as unknown as AnySupabaseClient;

  let query = supabase
    .from("deeds")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (applicationId) query = query.eq("application_id", applicationId);
  if (status) query = query.eq("status", status);

  const { data, error, count } = await query;

  if (error) {
    if (!isMissingTableError(error)) {
      return apiError(`Failed to list deeds: ${error.message}`, HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
    // `deeds` table not present yet — serve from the in-memory mock store.
    let filtered = mockDeeds;
    if (applicationId) filtered = filtered.filter((d) => d.application_id === applicationId);
    if (status) filtered = filtered.filter((d) => d.status === status);
    filtered = [...filtered].sort((a, b) => b.created_at.localeCompare(a.created_at));

    const total = filtered.length;
    const page = filtered.slice(offset, offset + limit);

    return NextResponse.json({ deeds: page, total, limit, offset });
  }

  return NextResponse.json({ deeds: data ?? [], total: count ?? (data?.length ?? 0), limit, offset });
});
