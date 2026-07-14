import type { OnboardingScoringResult, ProposalProperty } from "./types"

/**
 * Clave de sessionStorage donde el Agente AI Processing (Fase 3, en paralelo)
 * documenta que guarda el resultado del scoring. Si su implementación final usa
 * otra clave, este componente sigue funcionando en modo mock (tolerante) — solo
 * actualiza esta constante cuando su reporte confirme el nombre real.
 */
export const ONBOARDING_RESULT_KEY = "onboarding-result"

/**
 * Lee el resultado del scoring desde sessionStorage de forma tolerante: nunca
 * lanza, y devuelve `null` si no existe o el JSON es inválido/inesperado.
 */
export function readOnboardingResult(): OnboardingScoringResult | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.sessionStorage.getItem(ONBOARDING_RESULT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === "object") {
      return parsed as OnboardingScoringResult
    }
    return null
  } catch {
    return null
  }
}

/**
 * Datos MOCK de propiedades del "Combo Inversionista".
 *
 * Fallback usado mientras `GET /api/properties` no exista o no traiga las
 * métricas de inversión (capRate/plusvalia/flujoMensual) todavía — el motor de
 * pre-evaluación real llega en Release 2+. Shape pensada para calzar con lo que
 * se espera de la API real: { id, name, location, price, imageUrl }, a lo que
 * aquí se le agregan las métricas ilustrativas.
 */
const MOCK_PROPERTIES: ProposalProperty[] = [
  {
    id: "mock-1",
    name: "Edificio Vista Andes",
    location: "Ñuñoa, Santiago",
    price: 92_000_000,
    capRate: 9.1,
    plusvalia: 14.5,
    flujoMensual: 420_000,
  },
  {
    id: "mock-2",
    name: "Parque Los Aromos",
    location: "La Florida, Santiago",
    price: 78_500_000,
    capRate: 8.4,
    plusvalia: 12.8,
    flujoMensual: 365_000,
  },
  {
    id: "mock-3",
    name: "Torres del Río",
    location: "Providencia, Santiago",
    price: 115_000_000,
    capRate: 7.9,
    plusvalia: 16.2,
    flujoMensual: 510_000,
  },
]

/** Heurística ilustrativa para derivar métricas cuando la API real solo trae precio. */
function estimateMetrics(price: number): Pick<ProposalProperty, "capRate" | "plusvalia" | "flujoMensual"> {
  const capRate = Math.round((6 + (100_000_000 / Math.max(price, 1)) * 3) * 10) / 10
  const plusvalia = Math.round((capRate + 5.4) * 10) / 10
  const flujoMensual = Math.round((price * (capRate / 100)) / 12 / 1000) * 1000
  return { capRate, plusvalia, flujoMensual }
}

interface RawApiProperty {
  id?: string | number
  name?: string
  title?: string
  location?: string
  address?: string
  price?: number
  imageUrl?: string
  image_url?: string
  capRate?: number
  plusvalia?: number
  flujoMensual?: number
}

function normalizeApiProperty(raw: RawApiProperty, index: number): ProposalProperty {
  const price = typeof raw.price === "number" ? raw.price : 90_000_000
  const estimated = estimateMetrics(price)
  return {
    id: String(raw.id ?? `api-${index}`),
    name: raw.name ?? raw.title ?? "Propiedad sugerida",
    location: raw.location ?? raw.address ?? "Santiago, Chile",
    price,
    imageUrl: raw.imageUrl ?? raw.image_url,
    capRate: typeof raw.capRate === "number" ? raw.capRate : estimated.capRate,
    plusvalia: typeof raw.plusvalia === "number" ? raw.plusvalia : estimated.plusvalia,
    flujoMensual: typeof raw.flujoMensual === "number" ? raw.flujoMensual : estimated.flujoMensual,
  }
}

export interface FetchProposalPropertiesResult {
  properties: ProposalProperty[]
  source: "api" | "mock"
}

/**
 * Intenta traer propiedades reales de `GET /api/properties`. Si el endpoint no
 * existe (404), falla, o devuelve una lista vacía/inesperada, cae de vuelta a
 * los datos mock documentados arriba — nunca bloquea el render de la pantalla.
 */
export async function fetchProposalProperties(): Promise<FetchProposalPropertiesResult> {
  try {
    const res = await fetch("/api/properties", { cache: "no-store" })
    if (!res.ok) return { properties: MOCK_PROPERTIES, source: "mock" }
    const json = await res.json()
    const list: RawApiProperty[] = Array.isArray(json) ? json : Array.isArray(json?.properties) ? json.properties : []
    if (list.length === 0) return { properties: MOCK_PROPERTIES, source: "mock" }
    return { properties: list.slice(0, 3).map(normalizeApiProperty), source: "api" }
  } catch {
    return { properties: MOCK_PROPERTIES, source: "mock" }
  }
}

export function formatCLP(value: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value)
}
