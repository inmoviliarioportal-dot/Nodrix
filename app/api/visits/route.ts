import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { requireAuth, requirePermission, withErrorHandling, HTTP_STATUS, apiError } from "@/app/api/_shared";
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

type ScheduleVisitBody = {
  applicationId?: string;
  comuna?: string;
  scheduledAt?: string;
};

/**
 * POST /api/visits
 *
 * El CLIENTE agenda su propia visita (no requiere permiso de "Visitas" --
 * ese permiso es para el seguimiento del staff). Body:
 * `{ applicationId, comuna, scheduledAt }`. Reglas:
 * - La application debe estar en PRE_EVALUACION_COMPLETADA (recién ahí se
 *   le ofrecen valores por comuna al cliente, ver /api/properties/offers).
 * - No se pide un `propertyId` puntual -- se elige automáticamente una
 *   property disponible de esa comuna como referencia interna (la visita
 *   sigue apuntando a un proyecto real para la logística del asesor), pero
 *   la UI del cliente nunca elige "cuál" propiedad.
 */
export const POST = withErrorHandling(async (request: Request) => {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  const body = (await request.json().catch(() => null)) as ScheduleVisitBody | null;
  if (!body?.applicationId || !body?.comuna || !body?.scheduledAt) {
    return apiError(
      "applicationId, comuna y scheduledAt son requeridos",
      HTTP_STATUS.BAD_REQUEST,
      "INVALID_BODY"
    );
  }

  const supabase = createSupabaseServiceRoleClient() as unknown as AnySupabaseClient;

  const { data: application } = await (supabase.from("applications") as any)
    .select("id, stage")
    .eq("id", body.applicationId)
    .eq("org_id", MVP_ORG_ID)
    .maybeSingle();

  if (!application) {
    return apiError("Solicitud no encontrada", HTTP_STATUS.NOT_FOUND, "APPLICATION_NOT_FOUND");
  }
  if (application.stage !== "PRE_EVALUACION_COMPLETADA") {
    return apiError(
      "Solo puedes agendar una visita cuando tu solicitud está en 'Aprobado previo'.",
      HTTP_STATUS.BAD_REQUEST,
      "INVALID_STAGE"
    );
  }

  const { data: property } = await (supabase.from("properties") as any)
    .select("id")
    .eq("org_id", MVP_ORG_ID)
    .eq("comuna", body.comuna)
    .eq("available", true)
    .limit(1)
    .maybeSingle();

  if (!property) {
    return apiError(
      "No hay propiedades disponibles en esa comuna en este momento.",
      HTTP_STATUS.BAD_REQUEST,
      "NO_PROPERTY_AVAILABLE"
    );
  }

  const { data: visit, error } = await (supabase.from("visits") as any)
    .insert({
      org_id: MVP_ORG_ID,
      application_id: body.applicationId,
      property_id: property.id,
      scheduled_at: body.scheduledAt,
      status: "agendada",
    })
    .select("*")
    .single();

  if (error || !visit) {
    return apiError(
      `No se pudo agendar la visita: ${error?.message ?? "error desconocido"}`,
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }

  return NextResponse.json({ visit }, { status: 201 });
});
