import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase";
import { apiError, requireRole, withErrorHandling, HTTP_STATUS } from "@/app/api/_shared";
import { MVP_ORG_ID } from "@/app/api/auth/_constants";
import { PROPERTY_AMENITY_VALUES } from "@/lib/property-amenities";

const VALID_PURPOSES = ["inversion", "vivienda_propia", "ambos"] as const;
const VALID_TARGET_DESTINATIONS = ["vivir", "airbnb", "alquiler_tradicional", "venta_corto_plazo"] as const;

type PropertyBody = {
  name?: string;
  comuna?: string;
  location?: string;
  unitNumber?: string | null;
  priceUf?: number;
  purpose?: string;
  available?: boolean;
  images?: string[];
  floorPlanUrl?: string | null;
  videoUrl?: string | null;
  nearHistoricCenter?: boolean;
  nearTouristZone?: boolean;
  nearBusinessDistrict?: boolean;
  targetDestinations?: string[];
  amenities?: string[];
};

/** PATCH /api/admin/properties/{id} — edita una propiedad. Requiere admin/gerencia. */
export const PATCH = withErrorHandling(async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const auth = await requireRole(["admin", "gerencia"]);
  if (!auth.authorized) return auth.response;

  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as PropertyBody | null;
  if (!body) return apiError("Body inválido", HTTP_STATUS.BAD_REQUEST, "INVALID_BODY");

  if (body.purpose && !VALID_PURPOSES.includes(body.purpose as (typeof VALID_PURPOSES)[number])) {
    return apiError(
      `purpose inválido. Valores permitidos: ${VALID_PURPOSES.join(", ")}`,
      HTTP_STATUS.BAD_REQUEST,
      "INVALID_PURPOSE"
    );
  }
  if (body.priceUf !== undefined && (typeof body.priceUf !== "number" || body.priceUf <= 0)) {
    return apiError("priceUf debe ser un número positivo", HTTP_STATUS.BAD_REQUEST, "INVALID_PRICE");
  }
  const invalidDestination = body.targetDestinations?.find(
    (d) => !VALID_TARGET_DESTINATIONS.includes(d as (typeof VALID_TARGET_DESTINATIONS)[number])
  );
  if (invalidDestination) {
    return apiError(
      `targetDestinations inválido: "${invalidDestination}"`,
      HTTP_STATUS.BAD_REQUEST,
      "INVALID_TARGET_DESTINATION"
    );
  }
  const invalidAmenity = body.amenities?.find((a) => !PROPERTY_AMENITY_VALUES.includes(a));
  if (invalidAmenity) {
    return apiError(`amenities inválido: "${invalidAmenity}"`, HTTP_STATUS.BAD_REQUEST, "INVALID_AMENITY");
  }

  const update: Record<string, unknown> = {};
  if (body.name !== undefined) update.name = body.name.trim();
  if (body.comuna !== undefined) update.comuna = body.comuna.trim();
  if (body.location !== undefined) update.location = body.location.trim();
  if (body.unitNumber !== undefined) update.unit_number = body.unitNumber?.trim() || null;
  if (body.priceUf !== undefined) update.price_uf = body.priceUf;
  if (body.purpose !== undefined) update.purpose = body.purpose;
  if (body.available !== undefined) update.available = body.available;
  if (body.images !== undefined) update.images = body.images;
  if (body.floorPlanUrl !== undefined) update.floor_plan_url = body.floorPlanUrl;
  if (body.videoUrl !== undefined) update.video_url = body.videoUrl;
  if (body.nearHistoricCenter !== undefined) update.near_historic_center = body.nearHistoricCenter;
  if (body.nearTouristZone !== undefined) update.near_tourist_zone = body.nearTouristZone;
  if (body.nearBusinessDistrict !== undefined) update.near_business_district = body.nearBusinessDistrict;
  if (body.targetDestinations !== undefined) update.target_destinations = body.targetDestinations;
  if (body.amenities !== undefined) update.amenities = body.amenities;

  if (Object.keys(update).length === 0) {
    return apiError("Nada para actualizar", HTTP_STATUS.BAD_REQUEST, "EMPTY_UPDATE");
  }

  const supabase = createSupabaseServiceRoleClient() as any;
  const { data, error } = await supabase
    .from("properties")
    .update(update)
    .eq("id", id)
    .eq("org_id", MVP_ORG_ID)
    .select("*")
    .single();

  if (error || !data) {
    return apiError(
      `No se pudo actualizar la propiedad: ${error?.message ?? "no encontrada"}`,
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }

  return NextResponse.json({ property: data });
});

/** DELETE /api/admin/properties/{id} — elimina una propiedad. Requiere admin/gerencia. */
export const DELETE = withErrorHandling(async (_request: Request, context: { params: Promise<{ id: string }> }) => {
  const auth = await requireRole(["admin", "gerencia"]);
  if (!auth.authorized) return auth.response;

  const { id } = await context.params;
  const supabase = createSupabaseServiceRoleClient() as any;

  const { error } = await supabase.from("properties").delete().eq("id", id).eq("org_id", MVP_ORG_ID);
  if (error) {
    return apiError(error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR, "PROPERTY_DELETE_FAILED");
  }

  return NextResponse.json({ ok: true });
});
