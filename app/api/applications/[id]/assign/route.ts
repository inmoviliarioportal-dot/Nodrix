import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { apiError, requireRole, withErrorHandling, HTTP_STATUS } from "@/app/api/_shared";
import { MVP_ORG_ID } from "@/app/api/auth/_constants";
import type { AnySupabaseClient } from "@/lib/leads";

type AssignBody = {
  advisorUserId?: string | null;
};

/**
 * PATCH /api/applications/[id]/assign
 *
 * Body: `{ advisorUserId: string | null }` (`null` para desasignar).
 *
 * Asigna o reasigna el asesor a cargo de una solicitud. Requiere rol
 * admin/gerencia. Valida que `advisorUserId` corresponda a un usuario con
 * rol `asesor` en la misma organización.
 */
export const PATCH = withErrorHandling(async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const auth = await requireRole(["admin", "gerencia"]);
  if (!auth.authorized) return auth.response;

  const { id } = await context.params;
  if (!id) {
    return apiError("Missing application id", HTTP_STATUS.BAD_REQUEST, "MISSING_ID");
  }

  const body = (await request.json().catch(() => null)) as AssignBody | null;
  if (!body || !("advisorUserId" in body)) {
    return apiError("advisorUserId es requerido (usa null para desasignar)", HTTP_STATUS.BAD_REQUEST, "INVALID_BODY");
  }

  const supabase = createSupabaseServiceRoleClient() as unknown as AnySupabaseClient;

  if (body.advisorUserId) {
    const { data: advisor } = await (supabase.from("users") as any)
      .select("id, role")
      .eq("id", body.advisorUserId)
      .eq("org_id", MVP_ORG_ID)
      .maybeSingle();

    if (!advisor || advisor.role !== "asesor") {
      return apiError(
        "advisorUserId debe corresponder a un usuario con rol 'asesor'",
        HTTP_STATUS.BAD_REQUEST,
        "INVALID_ADVISOR"
      );
    }
  }

  const { data: updated, error } = await (supabase.from("applications") as any)
    .update({ assigned_advisor_id: body.advisorUserId })
    .eq("id", id)
    .eq("org_id", MVP_ORG_ID)
    .select("*")
    .single();

  if (error || !updated) {
    return apiError(
      `Failed to assign advisor: ${error?.message ?? "application not found"}`,
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }

  await (supabase.from("audit_events") as any).insert({
    org_id: MVP_ORG_ID,
    entity_type: "application",
    entity_id: id,
    action: "assign_advisor",
    actor_user_id: auth.user.id,
    after: { assigned_advisor_id: body.advisorUserId },
  });

  return NextResponse.json({ application: updated });
});
