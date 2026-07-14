import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase";
import { apiError, requireRole, withErrorHandling, HTTP_STATUS } from "@/app/api/_shared";
import { MVP_ORG_ID } from "@/app/api/auth/_constants";
import { APPLICATION_STAGES } from "@/lib/leads";

/**
 * GET /api/admin/applications-summary
 *
 * Conteo REAL (no mock) de solicitudes agrupadas por `stage` y por
 * `scoring_category` -- alimenta la vista "Solicitudes en curso" en
 * /admin/dashboard, con drilldown hacia /backoffice/queue filtrado.
 * Requiere rol admin/gerencia.
 */
export const GET = withErrorHandling(async () => {
  const auth = await requireRole(["admin", "gerencia"]);
  if (!auth.authorized) return auth.response;

  const supabase = createSupabaseServiceRoleClient() as any;

  const { data, error } = await supabase
    .from("applications")
    .select("stage, scoring_category")
    .eq("org_id", MVP_ORG_ID);

  if (error) {
    return apiError(error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR, "SUMMARY_FETCH_FAILED");
  }

  const rows: { stage: string; scoring_category: string | null }[] = data ?? [];

  const byStage: Record<string, number> = {};
  for (const stage of APPLICATION_STAGES) byStage[stage] = 0;

  const byCategory: Record<string, number> = { BRONCE: 0, PLATA: 0, ORO: 0, PLATINO: 0, BLACK: 0 };

  for (const row of rows) {
    if (row.stage in byStage) byStage[row.stage] += 1;
    if (row.scoring_category && row.scoring_category in byCategory) {
      byCategory[row.scoring_category] += 1;
    }
  }

  return NextResponse.json({ total: rows.length, byStage, byCategory });
});
