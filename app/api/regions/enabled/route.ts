import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase";
import { apiError, requireAuth, withErrorHandling, HTTP_STATUS } from "@/app/api/_shared";
import { CHILE_REGIONS } from "@/lib/chile-regions";

/**
 * GET /api/regions/enabled — regiones con `enabled = true`, con sus comunas
 * (tomadas de lib/chile-regions.ts). Endpoint público (cualquier usuario
 * autenticado) que consume `RegionComunaSelect` en el wizard/onboarding del
 * cliente.
 */
export const GET = withErrorHandling(async () => {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  const supabase = createSupabaseServiceRoleClient() as any;
  const { data, error } = await supabase.from("regions").select("id, name, enabled").eq("enabled", true);

  if (error) {
    return apiError(error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR, "REGIONS_FETCH_FAILED");
  }

  const enabledIds = new Set((data ?? []).map((r: { id: string }) => r.id));
  const regions = CHILE_REGIONS.filter((r) => enabledIds.has(r.id));

  return NextResponse.json({ regions });
});
