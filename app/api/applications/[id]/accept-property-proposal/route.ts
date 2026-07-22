import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { apiError, requireAuth, withErrorHandling, HTTP_STATUS } from "@/app/api/_shared";
import { MVP_ORG_ID } from "@/app/api/auth/_constants";
import { normalizeEmail, type AnySupabaseClient } from "@/lib/leads";

type Body = {
  departmentCount?: number;
  propertyIds?: string[];
};

const VALID_DEPARTMENT_COUNTS = [1, 2, 3];

/**
 * POST /api/applications/[id]/accept-property-proposal
 *
 * Persiste cuál de las 3 propuestas (1/2/3 departamentos) eligió el cliente
 * tras verlas en /onboarding/initial-proposal, junto con las propiedades
 * concretas incluidas. No cambia de etapa (la solicitud ya avanzó a
 * DOCUMENTOS_PENDIENTES en select-initial-proposal) -- solo agrega
 * trazabilidad.
 */
export const POST = withErrorHandling(async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as Body | null;

  if (
    !body ||
    typeof body.departmentCount !== "number" ||
    !VALID_DEPARTMENT_COUNTS.includes(body.departmentCount) ||
    !Array.isArray(body.propertyIds) ||
    body.propertyIds.length === 0 ||
    !body.propertyIds.every((pid) => typeof pid === "string")
  ) {
    return apiError(
      "Cuerpo de la solicitud inválido: se requiere departmentCount (1|2|3) y propertyIds.",
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
