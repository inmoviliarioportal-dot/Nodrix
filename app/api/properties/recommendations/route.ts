import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase";
import { apiError, requireAuth, withErrorHandling, HTTP_STATUS } from "@/app/api/_shared";
import { MVP_ORG_ID } from "@/app/api/auth/_constants";

type Purpose = "inversion" | "vivienda_propia" | "ambos";
type PropertyType = "casa" | "departamento";
type DepartmentCount = 1 | 2 | 3;

/** Destino real que el cliente declaró en el wizard -- ver lib/wizard-storage.ts. */
type PropertyDestination = "vivir" | "airbnb" | "alquiler_tradicional" | "venta_corto_plazo";

interface RecommendationsBody {
  // Opcional cuando purpose === "inversion": ese flujo va directo al
  // carrusel de propiedades sin pedir preferencias al cliente.
  comuna?: string;
  propertyType?: PropertyType;
  bedrooms?: number;
  bathrooms?: number;
  purpose: Purpose;
  /**
   * Presupuesto estimado en UF (viene de `ufPreEvaluation.estimatedPropertyValueUF`,
   * ver lib/uf-preevaluation.ts) -- solo se usa cuando purpose === "inversion",
   * para ordenar el carrusel por cercanía de precio al presupuesto real del
   * cliente en vez de solo por fecha de creación.
   */
  budgetUf?: number;
  /** Destino(s) elegidos por el cliente tras el wizard (puede elegir más de
   * uno, ej. Airbnb + Alquiler tradicional) -- determina si se aplica el
   * perfilamiento de proximidad (Airbnb/venta a corto plazo, ver más abajo).
   * `destination` (singular) se mantiene por compatibilidad. */
  destinations?: PropertyDestination[];
  destination?: PropertyDestination;
  /** Los 3 parámetros de proximidad que buscan los clientes de Airbnb/venta a
   * corto plazo (ver components/dashboard/ProximityProfileForm.tsx). Si no
   * se marca ninguno, el carrusel se comporta igual que antes (orden por
   * cercanía de precio). */
  profileHistoric?: boolean;
  profileTourist?: boolean;
  profileBusiness?: boolean;
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
  near_historic_center: boolean | null;
  near_tourist_zone: boolean | null;
  near_business_district: boolean | null;
  target_destinations: string[] | null;
  amenities: string[] | null;
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
  /** Todas las imágenes del proyecto/inmueble (no solo la miniatura) -- para
   * la galería flotante que el cliente puede abrir antes de aceptar. */
  images: string[];
  videoUrl: string | null;
  /** Servicios/comodidades (piscina, gimnasio, etc.) -- ver lib/property-amenities.ts.
   * Se muestran como íconos con tooltip en el carrusel (ver PropertyCarousel.tsx). */
  amenities: string[];
}

export interface PropertyCarouselGroup {
  destination: PropertyDestination;
  label: string;
  properties: PropertyRecommendation[];
}

export interface PropertyProposal {
  departmentCount: DepartmentCount;
  properties: PropertyRecommendation[];
}

const DESTINATION_LABELS: Record<PropertyDestination, string> = {
  vivir: "Vivienda",
  airbnb: "Airbnb",
  alquiler_tradicional: "Alquiler tradicional",
  venta_corto_plazo: "Venta a corto plazo",
};

/** Cantidad de propiedades mostradas en el carrusel de inversión. */
const CAROUSEL_SIZE = 6;

/**
 * POST /api/properties/recommendations
 *
 * A diferencia de GET /api/properties/offers (rangos agregados por comuna
 * para la etapa "aprobado previo"), este endpoint devuelve propiedades
 * CONCRETAS:
 *
 * - purpose === "inversion": un CARRUSEL de hasta 6 propiedades DISTINTAS
 *   (campo `carousel`), ordenadas por cercanía de precio al presupuesto
 *   estimado (`budgetUf`, viene de la pre-evaluación en UF) si se provee, o
 *   por más recientes si no. El cliente elige libremente cuántas quiere (no
 *   hay "bundles" de 1/2/3 departamentos -- ver PropertyCarousel.tsx).
 * - purpose === "vivienda_propia" | "ambos": lista plana de propiedades
 *   (campo `recommendations`) filtradas por comuna + preferencias (tipo,
 *   dormitorios, baños), con fallback progresivo: si no hay suficiente
 *   inventario, se relaja quitando primero baños, luego dormitorios, luego
 *   tipo, y como último recurso también la comuna -- para nunca dejar una
 *   lista vacía si existe al menos 1 propiedad disponible en el sistema.
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
      "id, name, comuna, location, price_uf, purpose, bedrooms, bathrooms, property_type, images, video_url, created_at, near_historic_center, near_tourist_zone, near_business_district, target_destinations, amenities"
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

  // Filtro de presupuesto: solo propiedades cuyo precio en UF sea <= a la
  // pre-evaluación del cliente (`budgetUf`, ver lib/uf-preevaluation.ts) --
  // antes solo se usaba para ORDENAR (más cercano al presupuesto primero),
  // por lo que igual aparecían inmuebles que el cliente no podía pagar. Se
  // aplica como filtro DURO antes de cualquier otra relajación (comuna,
  // tipo, dormitorios, baños): nunca mostramos algo por sobre el presupuesto
  // real, aunque eso implique menos (o cero) resultados.
  const withinBudget = (rows: PropertyRow[]) =>
    typeof body.budgetUf === "number" ? rows.filter((r) => r.price_uf <= (body.budgetUf as number)) : rows;

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
    const candidates = withinBudget(purposeMatches(rows));
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
      images: r.images ?? [],
      videoUrl: r.video_url ?? null,
      amenities: r.amenities ?? [],
    };
  }

  if (body.purpose === "inversion") {
    const candidates = withinBudget(purposeMatches(allRows));
    const pool = candidates.length > 0 ? candidates : withinBudget(allRows); // nunca vacío si hay inventario dentro de presupuesto

    // Perfilamiento Airbnb/venta a corto plazo: prioriza las propiedades que
    // matchean más de los 3 parámetros de proximidad declarados (casco
    // histórico/céntrico, zona turística, negocios/sector financiero) --
    // ver ProximityProfileForm.tsx. Si el cliente no marcó ninguno (o su
    // destino no aplica), el orden es idéntico al de antes (solo precio).
    const { profileHistoric, profileTourist, profileBusiness, budgetUf } = body;

    function proximityScore(r: PropertyRow): number {
      let score = 0;
      if (profileHistoric && r.near_historic_center) score++;
      if (profileTourist && r.near_tourist_zone) score++;
      if (profileBusiness && r.near_business_district) score++;
      return score;
    }

    function sortPool(rows: PropertyRow[], applyProximity: boolean): PropertyRow[] {
      return [...rows].sort((a, b) => {
        if (applyProximity) {
          const scoreDiff = proximityScore(b) - proximityScore(a);
          if (scoreDiff !== 0) return scoreDiff;
        }
        if (typeof budgetUf === "number") {
          return Math.abs(a.price_uf - budgetUf) - Math.abs(b.price_uf - budgetUf);
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    }

    function buildCarousel(rows: PropertyRow[], applyProximity: boolean): PropertyRecommendation[] {
      const sorted = sortPool(rows, applyProximity);
      const carousel: PropertyRecommendation[] = [];
      const seenIds = new Set<string>();
      for (const row of sorted) {
        if (seenIds.has(row.id)) continue;
        seenIds.add(row.id);
        carousel.push(toRecommendation(row));
        if (carousel.length >= CAROUSEL_SIZE) break;
      }
      return carousel;
    }

    // Un carrusel POR CADA destino que el cliente eligió (ej. Airbnb +
    // Alquiler tradicional => 2 carruseles separados), para que tanto el
    // cliente como el sistema tengan mejor conocimiento de qué propiedades
    // calzan con cada objetivo -- ver components/dashboard/PropertyPreferencesCard.tsx.
    // Cada carrusel se filtra primero por `target_destinations` (etiquetado
    // por el equipo comercial en el admin); si NINGUNA propiedad está
    // etiquetada para ese destino todavía, se cae al pool general de
    // "inversion" como antes, para no dejar al cliente sin opciones.
    const destinationList = body.destinations ?? (body.destination ? [body.destination] : []);
    if (destinationList.length > 0) {
      const carousels: PropertyCarouselGroup[] = destinationList.map((destination) => {
        const tagged = pool.filter((r) => r.target_destinations?.includes(destination));
        const rowsForDestination = tagged.length > 0 ? tagged : pool;
        const applyProximity = destination === "airbnb" || destination === "venta_corto_plazo";
        return {
          destination,
          label: DESTINATION_LABELS[destination],
          properties: buildCarousel(rowsForDestination, applyProximity && Boolean(profileHistoric || profileTourist || profileBusiness)),
        };
      });

      // `carousel` (singular, aplanado y deduplicado) se mantiene por
      // compatibilidad con cualquier consumidor viejo que no sepa de grupos.
      const flatSeen = new Set<string>();
      const flatCarousel: PropertyRecommendation[] = [];
      for (const group of carousels) {
        for (const p of group.properties) {
          if (flatSeen.has(p.id)) continue;
          flatSeen.add(p.id);
          flatCarousel.push(p);
        }
      }

      return NextResponse.json({ carousels, carousel: flatCarousel });
    }

    // Sin destinos declarados (legado): un solo carrusel general, igual que antes.
    const applyProximityProfiling = Boolean(profileHistoric || profileTourist || profileBusiness);
    const carousel = buildCarousel(pool, applyProximityProfiling);
    return NextResponse.json({ carousel });
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

  // purpose === "vivienda_propia" | "ambos": lista plana filtrada por comuna
  // + preferencias (ver PropertyPreferencesCard mode="housing"). Se
  // construye una sola "propuesta" de 1 y se devuelve su lista de
  // propiedades -- mismo mecanismo de relajación progresiva de pickPool.
  const properties = buildProposal(1).properties;
  return NextResponse.json({ recommendations: properties });
});
