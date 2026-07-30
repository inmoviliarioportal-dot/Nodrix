import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { apiError, requireAuth, withErrorHandling, HTTP_STATUS } from "@/app/api/_shared";
import { MVP_ORG_ID } from "@/app/api/auth/_constants";
import type { AnySupabaseClient } from "@/lib/leads";

const VALID_DESTINATIONS = ["vivir", "airbnb", "alquiler_tradicional", "venta_corto_plazo"] as const;
type Destination = (typeof VALID_DESTINATIONS)[number];

type Body = {
  destinations?: string[];
};

/**
 * POST /api/applications/[id]/select-destinations
 *
 * El cliente elige para qué destinará el inmueble DESPUÉS de ver sus UF
 * aprobadas (ver InitialProposalCard) -- ya NO se pregunta en el wizard
 * (ver lib/wizard-storage.ts v11). Puede elegir MÁS DE UNO a la vez (ej.
 * Airbnb + Alquiler tradicional), a diferencia del wizard viejo que solo
 * permitía uno. Persiste en `customers.property_destinations` (array,
 * fuente de verdad) y en los campos legado `property_destination`/
 * `investment_type` (primer valor / derivado) para que el resto del código
 * que todavía los lee (ej. lib/leads.ts, proposal-bands) siga funcionando.
 */
export const POST = withErrorHandling(async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as Body | null;

  if (!Array.isArray(body?.destinations) || body.destinations.length === 0) {
    return apiError("destinations es requerido y debe tener al menos un valor", HTTP_STATUS.BAD_REQUEST, "INVALID_BODY");
  }
  const destinations = Array.from(new Set(body.destinations)) as Destination[];
  const invalid = destinations.find((d) => !VALID_DESTINATIONS.includes(d));
  if (invalid) {
    return apiError(
      `destino inválido: "${invalid}". Valores permitidos: ${VALID_DESTINATIONS.join(", ")}`,
      HTTP_STATUS.BAD_REQUEST,
      "INVALID_DESTINATION"
    );
  }

  const supabase = createSupabaseServiceRoleClient() as unknown as AnySupabaseClient;

  const { data: application } = await (supabase.from("applications") as any)
    .select("id, customer_id")
    .eq("id", id)
    .eq("org_id", MVP_ORG_ID)
    .maybeSingle();

  if (!application) {
    return apiError("Solicitud no encontrada", HTTP_STATUS.NOT_FOUND, "APPLICATION_NOT_FOUND");
  }

  const hasVivir = destinations.includes("vivir");
  const hasInvestment = destinations.some((d) => d !== "vivir");
  const investmentType = hasVivir && hasInvestment ? "ambos" : hasInvestment ? "inversion" : "vivienda_propia";

  const { error } = await (supabase.from("customers") as any)
    .update({
      property_destinations: destinations,
      property_destination: destinations[0],
      investment_type: investmentType,
    })
    .eq("id", application.customer_id);

  if (error) {
    return apiError(`No se pudo guardar tu selección: ${error.message}`, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }

  return NextResponse.json({ destinations, investmentType });
});
