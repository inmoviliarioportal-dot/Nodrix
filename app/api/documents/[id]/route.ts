import { NextResponse } from "next/server";
import { requireAuth } from "@/app/api/_shared";
import { apiError, withErrorHandling, HTTP_STATUS } from "@/app/api/_shared";
import { createSupabaseServiceRoleClient } from "@/lib/supabase";

/** Valid `documents.status` values, exactly as defined in `database/schema.sql`. */
const DOCUMENT_STATUSES = ["pendiente", "en_revision", "aprobado", "rechazado"] as const;
type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

function isValidStatus(value: unknown): value is DocumentStatus {
  return typeof value === "string" && (DOCUMENT_STATUSES as readonly string[]).includes(value);
}

/**
 * GET /api/documents/[id]
 *
 * Returns the full `documents` row for the given id.
 * Response 200: the `documents` row. 404 if not found.
 */
export const GET = withErrorHandling(async (_request: Request, ctx: RouteContext<"/api/documents/[id]">) => {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  const { id } = await ctx.params;
  const supabase = createSupabaseServiceRoleClient();

  // NOTE: `lib/supabase/types.ts` is a placeholder pending the DB Architect's
  // generated types — `as any` is a temporary bridge, see app/api/documents/route.ts.
  const { data, error } = await (supabase.from("documents") as any)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return apiError(`Failed to fetch document: ${error.message}`, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
  if (!data) {
    return apiError("Document not found", HTTP_STATUS.NOT_FOUND, "DOCUMENT_NOT_FOUND");
  }

  return NextResponse.json(data);
});

/**
 * PATCH /api/documents/[id]
 *
 * Manual status change (Release 1 has no automated document validation —
 * that's Release 2). Body: `{ status: "pendiente" | "en_revision" | "aprobado" | "rechazado" }`.
 *
 * Response 200: the updated `documents` row.
 */
export const PATCH = withErrorHandling(
  async (request: Request, ctx: RouteContext<"/api/documents/[id]">) => {
    const auth = await requireAuth();
    if (!auth.authorized) return auth.response;

    const { id } = await ctx.params;
    const body = await request.json().catch(() => null);
    const status = body?.status;

    if (!isValidStatus(status)) {
      return apiError(
        `Invalid 'status'. Must be one of: ${DOCUMENT_STATUSES.join(", ")}`,
        HTTP_STATUS.BAD_REQUEST,
        "INVALID_STATUS"
      );
    }

    const supabase = createSupabaseServiceRoleClient();

    const { data, error } = await (supabase.from("documents") as any)
      .update({ status })
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) {
      return apiError(
        `Failed to update document: ${error.message}`,
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }
    if (!data) {
      return apiError("Document not found", HTTP_STATUS.NOT_FOUND, "DOCUMENT_NOT_FOUND");
    }

    return NextResponse.json(data);
  }
);
