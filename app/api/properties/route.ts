import { NextResponse } from "next/server";
import { apiError, requireAuth, withErrorHandling, HTTP_STATUS } from "@/app/api/_shared";

/**
 * GET /api/properties
 *
 * Query params (all optional):
 *   - `limit`  (default 20, max 200)
 *   - `offset` (default 0)
 *   - `priceMin` (default 0)
 *   - `priceMax` (default 100_000_000)
 *
 * ⚠️ MOCK / ILUSTRATIVO ⚠️
 * ---------------------------------------------------------------------------
 * Devuelve un catálogo de 500 propiedades generadas EN MEMORIA con un PRNG
 * determinístico (seeded, mulberry32) — NO se leen de `database/schema.sql`
 * (tabla `properties`, dominio del DB Architect, fuera del scope de este
 * agente). Mismo índice => siempre la misma propiedad (determinismo
 * verificable entre requests/instancias, ya que el seed es una constante).
 *
 * Rangos mock:
 *   - price:        20,000,000 - 500,000,000 (UF * 1000, ~$600k-$15M USD)
 *   - capRate:       4% - 12%
 *   - appreciation:  4% - 8%
 *   - monthlyFlow:  $500,000 - $3,000,000 (CLP)
 *
 * Requiere sesión autenticada.
 */

const TOTAL_PROPERTIES = 500;
const SEED = 424242;

const PRICE_MIN = 20_000_000;
const PRICE_MAX = 500_000_000;
const CAP_RATE_MIN = 0.04;
const CAP_RATE_MAX = 0.12;
const APPRECIATION_MIN = 0.04;
const APPRECIATION_MAX = 0.08;
const MONTHLY_FLOW_MIN = 500_000;
const MONTHLY_FLOW_MAX = 3_000_000;

const LOCATIONS = [
  "Las Condes, Santiago",
  "Providencia, Santiago",
  "Ñuñoa, Santiago",
  "Vitacura, Santiago",
  "La Reina, Santiago",
  "Viña del Mar, Valparaíso",
  "Concepción, Biobío",
  "La Serena, Coquimbo",
  "Temuco, Araucanía",
  "Puerto Varas, Los Lagos",
];

const PROPERTY_NAME_PREFIXES = [
  "Edificio",
  "Residencias",
  "Torre",
  "Condominio",
  "Parque",
  "Altos de",
  "Mirador",
  "Plaza",
];

const PROPERTY_NAME_SUFFIXES = [
  "del Sol",
  "del Parque",
  "Vista Andes",
  "Costanera",
  "Los Alerces",
  "El Bosque",
  "Central",
  "del Valle",
  "Norte",
  "Oriente",
];

/** Mulberry32 — PRNG determinístico simple (mismo seed = misma secuencia). */
function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Property {
  id: string;
  name: string;
  location: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  area: number;
  capRate: number;
  appreciation: number;
  monthlyFlow: number;
  image: string;
}

function generateProperties(count: number, seed: number): Property[] {
  const rand = mulberry32(seed);
  const properties: Property[] = [];

  for (let i = 0; i < count; i++) {
    const price = Math.round(PRICE_MIN + rand() * (PRICE_MAX - PRICE_MIN));
    const capRate = Number((CAP_RATE_MIN + rand() * (CAP_RATE_MAX - CAP_RATE_MIN)).toFixed(3));
    const appreciation = Number(
      (APPRECIATION_MIN + rand() * (APPRECIATION_MAX - APPRECIATION_MIN)).toFixed(3)
    );
    const monthlyFlow = Math.round(MONTHLY_FLOW_MIN + rand() * (MONTHLY_FLOW_MAX - MONTHLY_FLOW_MIN));
    const bedrooms = 1 + Math.floor(rand() * 4); // 1-4
    const bathrooms = 1 + Math.floor(rand() * 3); // 1-3
    const area = Math.round(35 + rand() * 165); // 35-200 m2
    const location = LOCATIONS[Math.floor(rand() * LOCATIONS.length)];
    const prefix = PROPERTY_NAME_PREFIXES[Math.floor(rand() * PROPERTY_NAME_PREFIXES.length)];
    const suffix = PROPERTY_NAME_SUFFIXES[Math.floor(rand() * PROPERTY_NAME_SUFFIXES.length)];

    properties.push({
      id: `prop-${i + 1}`,
      name: `${prefix} ${suffix}`,
      location,
      price,
      bedrooms,
      bathrooms,
      area,
      capRate,
      appreciation,
      monthlyFlow,
      image: `https://picsum.photos/seed/nodrix-property-${i + 1}/600/400`,
    });
  }

  return properties;
}

// Generado una vez por proceso (determinístico vía seed fijo) y reutilizado
// entre requests — evita recalcular 500 filas en cada llamada.
const ALL_PROPERTIES = generateProperties(TOTAL_PROPERTIES, SEED);

export const GET = withErrorHandling(async (request: Request) => {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  const { searchParams } = new URL(request.url);

  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 20, 1), 200);
  const offset = Math.max(Number(searchParams.get("offset")) || 0, 0);
  const priceMin = Number(searchParams.get("priceMin")) || 0;
  const priceMaxParam = searchParams.get("priceMax");
  const priceMax = priceMaxParam !== null ? Number(priceMaxParam) || 100_000_000 : 100_000_000;

  if (priceMin < 0 || priceMax < 0 || priceMin > priceMax) {
    return apiError("Invalid price range", HTTP_STATUS.BAD_REQUEST, "INVALID_PRICE_RANGE");
  }

  const filtered = ALL_PROPERTIES.filter((p) => p.price >= priceMin && p.price <= priceMax);
  const page = filtered.slice(offset, offset + limit);

  return NextResponse.json({
    properties: page,
    total: filtered.length,
    limit,
    offset,
  });
});
