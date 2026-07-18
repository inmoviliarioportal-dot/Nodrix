import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase";
import { apiError, requireAuth, withErrorHandling, HTTP_STATUS } from "@/app/api/_shared";
import { MVP_ORG_ID } from "@/app/api/auth/_constants";

type Purpose = "inversion" | "vivienda_propia" | "ambos";
type PropertyType = "casa" | "departamento";

interface RecommendationsBody {
  comuna: string;
  propertyType?: PropertyType;
  bedrooms?: number;
  bathrooms?: number;
  purpose: Purpose;
}

interface PropertyRow {
  id: string;
  name: string;
  comuna: string;
  location: string;
  price_uf: number;
  purpose: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  property_type: string | null;
  images: string[] | null;
  created_at: string;
}

const MAX_RESULTS = 3;

/**
 * POST /api/properties/recommendations
 *
 * A diferencia de GET /api/properties/offers (rangos agregados por comuna
 * para la etapa "aprobado previo"), este endpoint devuelve hasta 3
 * propiedades CONCRETAS -- se usa en el paso de preferencias de vivienda
 * (dormitorios/baños/tipo) que solo aplica a clientes vivienda_propia/ambos.
 *
 * Filtro estricto (comuna + purpose + propertyType/bedrooms/bathrooms si
 * vienen) con fallback progresivo: si no llega a 3 resultados, se relaja
 * quitando primero bathrooms, luego bedrooms, luego propertyType, quedando
 * siempre comuna + purpose como piso mínimo.
 */
export const POST = withErrorHandling(async (request: Request) => {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  const body = (await request.json().catch(() => null)) as RecommendationsBody | null;
  if (!body?.comuna || !body?.purpose) {
    return apiError("comuna y purpose son requeridos", HTTP_STATUS.BAD_REQUEST, "INVALID_BODY");
  }

  const supabase = createSupabaseServiceRoleClient() as any;

  const { data, error } = await supabase
    .from("properties")
    .select("id, name, comuna, location, price_uf, purpose, bedrooms, bathrooms, property_type, images, created_at")
    .eq("org_id", MVP_ORG_ID)
    .eq("available", true)
    .ilike("comuna", body.comuna);

  if (error) {
    return apiError(error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR, "RECOMMENDATIONS_FETCH_FAILED");
  }

  const rows = (data ?? []) as PropertyRow[];

  const purposeMatches = rows.filter(
    (r) => r.purpose === body.purpose || r.purpose === "ambos" || body.purpose === "ambos"
  );

  // Filtros progresivamente más relajados; cada uno es un subconjunto del
  // anterior más laxo, así siempre se toma el primero con >= 3 resultados
  // (o el último, el más relajado, si ninguno alcanza 3).
  const filterStages: Array<(r: PropertyRow) => boolean> = [
    (r) =>
      (body.propertyType ? r.property_type === body.propertyType : true) &&
      (body.bedrooms ? r.bedrooms === body.bedrooms : true) &&
      (body.bathrooms ? r.bathrooms === body.bathrooms : true),
    (r) =>
      (body.propertyType ? r.property_type === body.propertyType : true) &&
      (body.bedrooms ? r.bedrooms === body.bedrooms : true),
    (r) => (body.propertyType ? r.property_type === body.propertyType : true),
    () => true,
  ];

  let selected: PropertyRow[] = [];
  for (const stage of filterStages) {
    selected = purposeMatches.filter(stage);
    if (selected.length >= MAX_RESULTS) break;
  }

  selected = [...selected].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const recommendations = selected.slice(0, MAX_RESULTS).map((r) => ({
    id: r.id,
    name: r.name,
    comuna: r.comuna,
    location: r.location,
    priceUf: r.price_uf,
    bedrooms: r.bedrooms,
    bathrooms: r.bathrooms,
    propertyType: r.property_type,
    image: r.images?.[0] ?? null,
  }));

  return NextResponse.json({ recommendations });
});
