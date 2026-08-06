import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { apiError, requireAuth, withErrorHandling, HTTP_STATUS } from "@/app/api/_shared";
import { MVP_ORG_ID } from "@/app/api/auth/_constants";
import { loadApplicationDetail } from "@/lib/application-detail";
import type { AnySupabaseClient } from "@/lib/leads";

/**
 * GET /api/applications/[id]
 *
 * Returns full detail for one application, including its customer, stage
 * history and the properties the client selected (with the destination they
 * picked each one for). Requires an authenticated session.
 *
 * La carga vive en `lib/application-detail.ts` porque `GET /api/auth/user`
 * devuelve exactamente el mismo detalle para el panel del cliente.
 */
export const GET = withErrorHandling(async (_request: Request, context: { params: Promise<{ id: string }> }) => {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  const { id } = await context.params;
  if (!id) {
    return apiError("Missing application id", HTTP_STATUS.BAD_REQUEST, "MISSING_ID");
  }

  const supabase = createSupabaseServiceRoleClient() as unknown as AnySupabaseClient;
  const detail = await loadApplicationDetail(supabase, id, MVP_ORG_ID);

  if (!detail) {
    return apiError("Application not found", HTTP_STATUS.NOT_FOUND, "APPLICATION_NOT_FOUND");
  }

  return NextResponse.json(detail);
});
