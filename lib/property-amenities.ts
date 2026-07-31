/**
 * Taxonomía de servicios/comodidades de una propiedad -- el equipo comercial
 * los marca al cargar el inventario (ver app/admin/properties/page.tsx) y el
 * cliente los ve como íconos con tooltip en el carrusel de propiedades (ver
 * components/dashboard/PropertyCarousel.tsx). Datos puros (sin JSX/íconos)
 * para poder importarse tanto desde rutas de API (server) como desde
 * componentes cliente -- el mapeo a íconos de lucide-react vive en
 * components/dashboard/amenityIcons.tsx.
 */

export const PROPERTY_AMENITIES = [
  { value: "piscina", label: "Piscina" },
  { value: "gimnasio", label: "Gimnasio" },
  { value: "areas_comunes", label: "Áreas comunes" },
  { value: "quincho", label: "Quincho / BBQ" },
  { value: "bicicletero", label: "Bicicletero" },
  { value: "estacionamiento", label: "Estacionamiento" },
  { value: "conserjeria", label: "Conserjería 24h" },
  { value: "ascensor", label: "Ascensor" },
  { value: "lavanderia", label: "Lavandería" },
  { value: "salon_eventos", label: "Salón de eventos" },
  { value: "coworking", label: "Coworking" },
  { value: "rooftop", label: "Rooftop / terraza" },
  { value: "juegos_infantiles", label: "Juegos infantiles" },
  { value: "pet_friendly", label: "Pet friendly" },
  { value: "sala_cine", label: "Sala de cine" },
  { value: "cerca_metro", label: "Cerca del metro" },
  { value: "cerca_comercio", label: "Cerca de comercio" },
  { value: "cerca_colegios", label: "Cerca de colegios" },
  { value: "cerca_parques", label: "Cerca de parques y áreas verdes" },
] as const;

export type PropertyAmenity = (typeof PROPERTY_AMENITIES)[number]["value"];

export const PROPERTY_AMENITY_VALUES: readonly string[] = PROPERTY_AMENITIES.map((a) => a.value);

export const PROPERTY_AMENITY_LABELS: Record<string, string> = Object.fromEntries(
  PROPERTY_AMENITIES.map((a) => [a.value, a.label])
);
