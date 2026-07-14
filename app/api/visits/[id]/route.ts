import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { requirePermission, withErrorHandling, HTTP_STATUS, apiError } from "@/app/api/_shared";
import { MVP_ORG_ID } from "@/app/api/auth/_constants";
import type { AnySupabaseClient } from "@/lib/leads";

const VISIT_STATUSES = ["agendada", "realizada", "cancelada", "no_show"] as const;
type VisitStatus = (typeof VISIT_STATUSES)[number];

type PatchBody = {
  status?: VisitStatus;
  scheduledAt?: string;
};

/**
 * PATCH /api/visits/{id}
 *
 * Body: `{ status? }` para marcar realizada/cancelada/no_show y/o
 * `{ scheduledAt? }` para reagendar la visita. El reagendamiento (cambiar
 * `scheduled_at`) está restringido a admin/gerencia -- el asesor builtin
 * solo puede actualizar el estado. Un rol personalizado con permiso de
 * "editar" en Visitas puede hacer ambas cosas (así se arma un rol de
 * "solo reagendamiento": Visitas -> Editar, el resto en "Sin acceso").
 */
export const PATCH = withErrorHandling(async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const auth = await requirePermission("visitas", "edit");
  if (!auth.authorized) return auth.response;

  const { id } = await context.params;
  if (!id) {
    return apiError("Missing visit id", HTTP_STATUS.BAD_REQUEST, "MISSING_ID");
  }

  const body = (await request.json().catch(() => null)) as PatchBody | null;
  if (!body || (!body.status && !body.scheduledAt)) {
    return apiError("Debes enviar 'status' y/o 'scheduledAt'", HTTP_STATUS.BAD_REQUEST, "INVALID_BODY");
  }

  if (body.status && !VISIT_STATUSES.includes(body.status)) {
    return apiError("status inválido", HTTP_STATUS.BAD_REQUEST, "INVALID_STATUS");
  }

  if (body.scheduledAt && auth.role === "asesor") {
    return apiError(
      "Solo admin/gerencia pueden reagendar visitas.",
      HTTP_STATUS.FORBIDDEN,
      "FORBIDDEN_RESCHEDULE"
    );
  }

  const update: Record<string, unknown> = {};
  if (body.status) {
    update.status = body.status;
    update.completed_at = body.status === "realizada" ? new Date().toISOString() : null;
  }
  if (body.scheduledAt) {
    update.scheduled_at = body.scheduledAt;
    update.status = "agendada";
    update.completed_at = null;
  }

  const supabase = createSupabaseServiceRoleClient() as unknown as AnySupabaseClient;

  const { data: updated, error } = await (supabase.from("visits") as any)
    .update(update)
    .eq("id", id)
    .eq("org_id", MVP_ORG_ID)
    .select("*")
    .single();

  if (error || !updated) {
    return apiError(
      `Failed to update visit: ${error?.message ?? "visit not found"}`,
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }

  return NextResponse.json({ visit: updated });
});
