import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase";
import { apiError, requireAuth, withErrorHandling, HTTP_STATUS } from "@/app/api/_shared";
import { MVP_ORG_ID } from "@/app/api/auth/_constants";

interface PropertyRow {
  id: string;
  comuna: string;
  price_uf: number;
  purpose: string | null;
  images: string[] | null;
  floor_plan_url: string | null;
}

interface PriceRange {
  minUf: number;
  maxUf: number;
}

export interface ComunaOffer {
  comuna: string;
  investment: PriceRange | null;
  housing: PriceRange | null;
  referenceImage: string | null;
  floorPlanUrl: string | null;
  /** id de una property representativa de la comuna, usado únicamente para
   * poder agendar la visita (POST /api/visits) -- nunca se expone como "la"
   * propiedad al cliente, la UI solo muestra la comuna y los rangos. */
  sampleReferencePropertyId: string;
}

/**
 * GET /api/properties/offers
 *
 * Agrega el inventario de `properties` por comuna: rango de precio UF
 * disponible para inversión y para vivienda propia, más una imagen
 * referencial y el plano si existe. El cliente NUNCA ve el listado de
 * properties individuales -- ver conversación de producto: la idea es
 * mostrar valores por comuna con fotos referenciales para incentivar a
 * agendar una visita física, no que elija por foto de una unidad puntual.
 */
export const GET = withErrorHandling(async () => {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  const supabase = createSupabaseServiceRoleClient() as any;
  const { data, error } = await supabase
    .from("properties")
    .select("id, comuna, price_uf, purpose, images, floor_plan_url")
    .eq("org_id", MVP_ORG_ID)
    .eq("available", true);

  if (error) {
    return apiError(error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR, "OFFERS_FETCH_FAILED");
  }

  const byComuna = new Map<string, PropertyRow[]>();
  for (const row of (data ?? []) as PropertyRow[]) {
    if (!row.comuna) continue;
    const list = byComuna.get(row.comuna) ?? [];
    list.push(row);
    byComuna.set(row.comuna, list);
  }

  const offers: ComunaOffer[] = [];
  for (const [comuna, rows] of byComuna) {
    const investmentRows = rows.filter((r) => r.purpose === "inversion" || r.purpose === "ambos");
    const housingRows = rows.filter((r) => r.purpose === "vivienda_propia" || r.purpose === "ambos");

    const investment = rangeOf(investmentRows);
    const housing = rangeOf(housingRows);
    const withImage = rows.find((r) => (r.images ?? []).length > 0);
    const withFloorPlan = rows.find((r) => r.floor_plan_url);

    offers.push({
      comuna,
      investment,
      housing,
      referenceImage: withImage?.images?.[0] ?? null,
      floorPlanUrl: withFloorPlan?.floor_plan_url ?? null,
      sampleReferencePropertyId: rows[0].id,
    });
  }

  offers.sort((a, b) => a.comuna.localeCompare(b.comuna));

  return NextResponse.json({ offers });
});

function rangeOf(rows: PropertyRow[]): PriceRange | null {
  if (rows.length === 0) return null;
  const prices = rows.map((r) => r.price_uf);
  return { minUf: Math.min(...prices), maxUf: Math.max(...prices) };
}
