import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { apiError, requireAuth, withErrorHandling, HTTP_STATUS } from "@/app/api/_shared";
import { MVP_ORG_ID } from "@/app/api/auth/_constants";
import { normalizeEmail, type AnySupabaseClient } from "@/lib/leads";

type Body = {
  propertyId?: string;
};

/**
 * POST /api/applications/[id]/accept-housing-property
 *
 * Persiste la propiedad de vivienda propia (individual, no bundle) elegida
 * por el cliente cuando purpose es "vivienda_propia" o "ambos" -- ver
 * PropertyPreferencesCard. Mismo patrón de ownership+trazabilidad que
 * accept-property-proposal.
 */
export const POST = withErrorHandling(async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as Body | null;

  if (!body || typeof body.propertyId !== "string" || !body.propertyId) {
    return apiError(
      "Cuerpo de la solicitud inválido: se requiere propertyId.",
      HTTP_STATUS.BAD_REQUEST,
      "INVALID_BODY"
    );
  }

  const supabase = createSupabaseServiceRoleClient() as unknown as AnySupabaseClient;

  const email = auth.user.email;
  if (!email) {
    return apiError("El usuario autenticado no tiene email.", HTTP_STATUS.BAD_REQUEST, "MISSING_USER_EMAIL");
  }

  const { data: customer } = await (supabase.from("customers") as any)
    .select("id")
    .eq("org_id", MVP_ORG_ID)
    .ilike("email", normalizeEmail(email))
    .maybeSingle();

  if (!customer) {
    return apiError("No se encontró tu perfil de cliente.", HTTP_STATUS.NOT_FOUND, "CUSTOMER_NOT_FOUND");
  }

  const { data: application } = await (supabase.from("applications") as any)
    .select("id, stage, customer_id")
    .eq("id", id)
    .eq("org_id", MVP_ORG_ID)
    .maybeSingle();

  if (!application || application.customer_id !== customer.id) {
    return apiError("Solicitud no encontrada.", HTTP_STATUS.NOT_FOUND, "APPLICATION_NOT_FOUND");
  }

  const { data: updatedApplication, error: updateError } = await (supabase.from("applications") as any)
    .update({
      accepted_housing_property_id: body.propertyId,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (updateError || !updatedApplication) {
    return apiError(
      `No se pudo guardar la propiedad seleccionada: ${updateError?.message ?? "error desconocido"}`,
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }

  await supabase.from("application_stage_history").insert({
    application_id: id,
    from_stage: application.stage,
    to_stage: application.stage,
    actor_user_id: null,
    note: "Cliente aceptó la propiedad de vivienda propia seleccionada.",
  });

  return NextResponse.json({ application: updatedApplication });
});
