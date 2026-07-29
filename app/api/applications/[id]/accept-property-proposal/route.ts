import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { apiError, requireAuth, withErrorHandling, HTTP_STATUS } from "@/app/api/_shared";
import { MVP_ORG_ID } from "@/app/api/auth/_constants";
import { normalizeEmail, type AnySupabaseClient } from "@/lib/leads";

type Body = {
  departmentCount?: number;
  propertyIds?: string[];
};

/** Máximo de propiedades seleccionables -- coincide con CAROUSEL_SIZE en
 * app/api/properties/recommendations/route.ts. */
const MAX_SELECTABLE_PROPERTIES = 6;

/**
 * POST /api/applications/[id]/accept-property-proposal
 *
 * Persiste qué propiedades de inversión eligió el cliente del carrusel de
 * hasta 6 (ver PropertyCarousel.tsx) tras verlas en
 * /onboarding/initial-proposal -- el cliente elige libremente cuántas
 * quiere (1, 2, 4, 6...), no hay "bundles" fijos de 1/2/3 departamentos.
 * `departmentCount` se mantiene como el conteo de propiedades elegidas
 * (nombre heredado del modelo anterior, sigue siendo útil como métrica).
 * No cambia de etapa (la solicitud ya avanzó a DOCUMENTOS_PENDIENTES en
 * select-initial-proposal) -- solo agrega trazabilidad.
 */
export const POST = withErrorHandling(async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as Body | null;

  if (
    !body ||
    typeof body.departmentCount !== "number" ||
    !Array.isArray(body.propertyIds) ||
    body.propertyIds.length === 0 ||
    body.propertyIds.length > MAX_SELECTABLE_PROPERTIES ||
    body.departmentCount !== body.propertyIds.length ||
    !body.propertyIds.every((pid) => typeof pid === "string")
  ) {
    return apiError(
      `Cuerpo de la solicitud inválido: se requiere departmentCount igual a la cantidad de propertyIds (máximo ${MAX_SELECTABLE_PROPERTIES}).`,
      HTTP_STATUS.BAD_REQUEST,
      "INVALID_BODY"
    );
  }

  const supabase = createSupabaseServiceRoleClient() as unknown as AnySupabaseClient;

  // Verificar que la application pertenezca al usuario autenticado (mismo
  // patrón que update-financial-profile).
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
      selected_property_ids: body.propertyIds,
      accepted_department_count: body.departmentCount,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (updateError || !updatedApplication) {
    return apiError(
      `No se pudo guardar tu propuesta aceptada: ${updateError?.message ?? "error desconocido"}`,
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }

  await supabase.from("application_stage_history").insert({
    application_id: id,
    from_stage: application.stage,
    to_stage: application.stage,
    actor_user_id: null,
    note: `Cliente aceptó una propuesta de ${body.departmentCount} departamento(s).`,
  });

  return NextResponse.json({ application: updatedApplication });
});
