import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { apiError, requireAuth, withErrorHandling, HTTP_STATUS } from "@/app/api/_shared";
import { MVP_ORG_ID } from "@/app/api/auth/_constants";
import { normalizeEmail } from "@/lib/leads";

/**
 * GET /api/applications/[id]/selected-properties
 *
 * Devuelve las propiedades que el cliente ya eligió y aceptó durante el
 * flujo de propuestas (inversión: `applications.selected_property_ids`;
 * vivienda propia: `applications.accepted_housing_property_id`) -- se usa
 * para que `ScheduleVisitCard` pueda ofrecerle agendar visita a ESAS
 * propiedades concretas (no a un listado genérico por comuna) apenas
 * llega a `DOCUMENTOS_PENDIENTES`, en paralelo a la subida de documentos.
 */
export const GET = withErrorHandling(async (_request: Request, context: { params: Promise<{ id: string }> }) => {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  const { id } = await context.params;
  const supabase = createSupabaseServiceRoleClient() as any;

  const email = auth.user.email;
  if (!email) {
    return apiError("El usuario autenticado no tiene email.", HTTP_STATUS.BAD_REQUEST, "MISSING_USER_EMAIL");
  }

  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("org_id", MVP_ORG_ID)
    .ilike("email", normalizeEmail(email))
    .maybeSingle();

  if (!customer) {
    return apiError("No se encontró tu perfil de cliente.", HTTP_STATUS.NOT_FOUND, "CUSTOMER_NOT_FOUND");
  }

  const { data: application } = await supabase
    .from("applications")
    .select("id, customer_id, selected_property_ids, accepted_housing_property_id")
    .eq("id", id)
    .eq("org_id", MVP_ORG_ID)
    .maybeSingle();

  if (!application || application.customer_id !== customer.id) {
    return apiError("Solicitud no encontrada.", HTTP_STATUS.NOT_FOUND, "APPLICATION_NOT_FOUND");
  }

  const ids = Array.from(
    new Set([...(application.selected_property_ids ?? []), application.accepted_housing_property_id].filter(Boolean))
  ) as string[];

  if (ids.length === 0) {
    return NextResponse.json({ properties: [] });
  }

  const { data: properties, error } = await supabase
    .from("properties")
    .select("id, name, comuna, location, images")
    .in("id", ids);

  if (error) {
    return apiError(error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR, "PROPERTIES_FETCH_FAILED");
  }

  return NextResponse.json({
    properties: (properties ?? []).map((p: any) => ({
      id: p.id,
      name: p.name,
      comuna: p.comuna,
      location: p.location,
      image: p.images?.[0] ?? null,
    })),
  });
});
