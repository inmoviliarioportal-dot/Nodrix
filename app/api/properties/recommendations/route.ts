import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase";
import { apiError, requireAuth, withErrorHandling, HTTP_STATUS } from "@/app/api/_shared";
import { MVP_ORG_ID } from "@/app/api/auth/_constants";

type Purpose = "inversion" | "vivienda_propia" | "ambos";
type PropertyType = "casa" | "departamento";
type DepartmentCount = 1 | 2 | 3;

interface RecommendationsBody {
  // Opcional cuando purpose === "inversion": ese flujo va directo a las 3
  // propuestas de 1/2/3 departamentos sin pedir preferencias al cliente.
  comuna?: string;
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
  video_url: string | null;
  created_at: string;
}

export interface PropertyRecommendation {
  id: string;
  name: string;
  comuna: string;
  location: string;
  priceUf: number;
  bedrooms: number | null;
  bathrooms: number | null;
  propertyType: string | null;
  image: string | null;
  videoUrl: string | null;
}

export interface PropertyProposal {
  departmentCount: DepartmentCount;
  properties: PropertyRecommendation[];
}

const DEPARTMENT_COUNTS: DepartmentCount[] = [1, 2, 3];

/**
 * POST /api/properties/recommendations
 *
 * A diferencia de GET /api/properties/offers (rangos agregados por comuna
 * para la etapa "aprobado previo"), este endpoint devuelve propiedades
 * CONCRETAS agrupadas en 3 "propuestas" seleccionables (1, 2 o 3
 * departamentos) -- se usa en el paso de preferencias de vivienda que ahora
 * aplica a TODOS los purposes (inversión, vivienda_propia, ambos).
 *
 * Filtro estricto (comuna + purpose + propertyType/bedrooms/bathrooms si
 * vienen) con fallback progresivo: si no hay suficiente inventario, se
 * relaja quitando primero bathrooms, luego bedrooms, luego propertyType, y
 * como último recurso también la comuna -- para NUNCA dejar una propuesta
 * vacía si existe al menos 1 propiedad disponible en todo el sistema.
 *
 * Cada propuesta necesita N propiedades DISTINTAS idealmente, pero si el
 * inventario real disponible es menor a N, se permite repetir propiedades
 * entre propuestas (o dentro de la misma) para poder mostrar siempre algo
 * concreto -- el inventario de un MVP inmobiliario chico normalmente no
 * alcanza para 1+2+3 = 6 propiedades únicas por comuna.
 */
export const POST = withErrorHandling(async (request: Request) => {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  const body = (await request.json().catch(() => null)) as RecommendationsBody | null;
  if (!body?.purpose) {
    return apiError("purpose es requerido", HTTP_STATUS.BAD_REQUEST, "INVALID_BODY");
  }
  // comuna es requerida salvo para inversión pura (esa propuesta no filtra
  // por preferencias de vivienda -- ver PropertyPreferencesCard).
  if (!body.comuna && body.purpose !== "inversion") {
    return apiError("comuna es requerida", HTTP_STATUS.BAD_REQUEST, "INVALID_BODY");
  }

  const supabase = createSupabaseServiceRoleClient() as any;

  const { data, error } = await supabase
    .from("properties")
    .select(
      "id, name, comuna, location, price_uf, purpose, bedrooms, bathrooms, property_type, images, video_url, created_at"
    )
    .eq("org_id", MVP_ORG_ID)
    .eq("available", true);

  if (error) {
    return apiError(error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR, "RECOMMENDATIONS_FETCH_FAILED");
  }

  const allRows = (data ?? []) as PropertyRow[];

  const purposeMatches = (rows: PropertyRow[]) =>
    rows.filter((r) => r.purpose === body.purpose || r.purpose === "ambos" || body.purpose === "ambos");

  const inComuna = body.comuna
    ? allRows.filter((r) => r.comuna?.toLowerCase() === body.comuna!.toLowerCase())
    : allRows;

  // Etapas de relajación: comuna+purpose+filtros estrictos -> ... -> sin
  // comuna (último recurso, solo si en la comuna elegida no hay nada).
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

  function pickPool(rows: PropertyRow[], minCount: number): PropertyRow[] {
    const candidates = purposeMatches(rows);
    let selected: PropertyRow[] = [];
    for (const stage of filterStages) {
      selected = candidates.filter(stage);
      if (selected.length >= minCount) break;
    }
    return [...selected].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  function toRecommendation(r: PropertyRow): PropertyRecommendation {
    return {
      id: r.id,
      name: r.name,
      comuna: r.comuna,
      location: r.location,
      priceUf: r.price_uf,
      bedrooms: r.bedrooms,
      bathrooms: r.bathrooms,
      propertyType: r.property_type,
      image: r.images?.[0] ?? null,
      videoUrl: r.video_url ?? null,
    };
  }

  function buildProposal(count: DepartmentCount): PropertyProposal {
    // Piso: comuna + purpose. Si no hay suficientes propiedades en la
    // comuna, se cae al pool global (sin filtrar por comuna) como último
    // recurso -- nunca dejar una propuesta vacía habiendo inventario.
    let pool = pickPool(inComuna, count);
    if (pool.length < count) {
      const globalPool = pickPool(allRows, count);
      if (globalPool.length > pool.length) pool = globalPool;
    }

    // Repetir propiedades si el inventario real es menor a `count`: mejor
    // mostrar la misma propiedad varias veces que dejar la propuesta vacía.
    const properties: PropertyRecommendation[] = [];
    for (let i = 0; i < count && pool.length > 0; i++) {
      properties.push(toRecommendation(pool[i % pool.length]));
    }

    return { departmentCount: count, properties };
  }

  const proposals = DEPARTMENT_COUNTS.map(buildProposal);

  // Se mantiene `recommendations` (plano, propuesta de 1 depto) por si algún
  // consumidor viejo del contrato anterior sigue leyendo ese campo.
  return NextResponse.json({ proposals, recommendations: proposals[0]?.properties ?? [] });
});
