import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { requirePermission, withErrorHandling, HTTP_STATUS, apiError } from "@/app/api/_shared";
import { MVP_ORG_ID } from "@/app/api/auth/_constants";
import type { AnySupabaseClient } from "@/lib/leads";

/**
 * GET /api/visits
 *
 * Lista las visitas agendadas/realizadas, con datos de cliente y propiedad
 * para que el asesor/admin/gerencia (o un rol personalizado con permiso de
 * "ver" en Visitas) pueda hacer seguimiento sin entrar a cada solicitud
 * individualmente.
 */
export const GET = withErrorHandling(async () => {
  const auth = await requirePermission("visitas", "view");
  if (!auth.authorized) return auth.response;

  const supabase = createSupabaseServiceRoleClient() as unknown as AnySupabaseClient;

  const { data, error } = await (supabase.from("visits") as any)
    .select(
      `id, org_id, application_id, property_id, scheduled_at, completed_at, status, created_at,
       application:applications ( id, stage, assigned_advisor_id, customer_id,
         customer:customers ( id, name, email, phone ) ),
       property:properties ( id, name, location )`
    )
    .eq("org_id", MVP_ORG_ID)
    .order("scheduled_at", { ascending: true });

  if (error) {
    return apiError(error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR, "VISITS_FETCH_FAILED");
  }

  return NextResponse.json({ visits: data ?? [] });
});
