"use client"

import { MapPin, BedDouble, Bath, Home } from "lucide-react"

export interface PropertyRecommendation {
  id: string
  name: string
  comuna: string
  location: string
  priceUf: number
  bedrooms: number | null
  bathrooms: number | null
  propertyType: string | null
  image: string | null
}

/**
 * Muestra hasta 3 propiedades concretas recomendadas según las
 * preferencias que el cliente ingresó en `PropertyPreferencesCard`. Estilo
 * calcado de `ComunaOffersCard` (tarjeta con imagen + datos + badge), pero
 * acá SÍ se muestra la propiedad específica -- este paso solo aplica a
 * clientes vivienda_propia/ambos que ya definieron dormitorios/baños/tipo.
 */
function PropertyRecommendations({ recommendations }: { recommendations: PropertyRecommendation[] }) {
  if (recommendations.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-6">
        <p className="text-sm text-text-tertiary">
          No encontramos propiedades que coincidan con tus preferencias por ahora. Tu asesor te contactará con
          alternativas.
        </p>
      </div>
    )
  }

  return (
    <div className="glass-card flex flex-col gap-5 rounded-2xl p-6">
      <div>
        <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-text-tertiary">
          Propiedades recomendadas para ti
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Según tus preferencias, estas son algunas alternativas disponibles.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {recommendations.map((property) => (
          <div
            key={property.id}
            className="flex flex-col overflow-hidden rounded-xl border border-glass-border bg-surface-elevated"
          >
            {property.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={property.image}
                alt={`Imagen de ${property.name}`}
                className="h-32 w-full object-cover"
              />
            )}
            <div className="flex flex-col gap-2 p-4">
              <p className="text-sm font-medium text-text-primary">{property.name}</p>
              <p className="flex items-center gap-1.5 text-xs text-text-secondary">
                <MapPin className="size-3.5 text-neon-cyan" />
                {property.comuna}
              </p>
              <p className="text-sm font-semibold text-text-primary">{property.priceUf} UF</p>
              <div className="flex flex-wrap gap-2 text-xs text-text-tertiary">
                {property.propertyType && (
                  <span className="inline-flex items-center gap-1">
                    <Home className="size-3.5" />
                    {property.propertyType === "casa" ? "Casa" : "Departamento"}
                  </span>
                )}
                {property.bedrooms != null && (
                  <span className="inline-flex items-center gap-1">
                    <BedDouble className="size-3.5" />
                    {property.bedrooms}
                  </span>
                )}
                {property.bathrooms != null && (
                  <span className="inline-flex items-center gap-1">
                    <Bath className="size-3.5" />
                    {property.bathrooms}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export { PropertyRecommendations }
