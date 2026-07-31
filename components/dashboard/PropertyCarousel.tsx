"use client"

import * as React from "react"
import { MapPin, BedDouble, Bath, Home, Check, Images, ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { PropertyGalleryModal } from "@/components/dashboard/PropertyGalleryModal"
import { PROPERTY_AMENITY_LABELS } from "@/lib/property-amenities"
import { AMENITY_ICONS } from "@/components/dashboard/amenityIcons"
import type { PropertyAmenity } from "@/lib/property-amenities"

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
  images: string[]
  videoUrl: string | null
  amenities: string[]
}

/** Hasta cuántos íconos de servicio se muestran directo en la tarjeta antes
 * de resumir el resto en un "+N" (para no saturar la tarjeta). */
const MAX_VISIBLE_AMENITIES = 4

/** Ícono de servicio con burbuja informativa (tooltip) al pasar el cursor --
 * CSS puro vía group-hover, sin JS ni librerías. */
function AmenityBadge({ value }: { value: string }) {
  const Icon = AMENITY_ICONS[value as PropertyAmenity]
  const label = PROPERTY_AMENITY_LABELS[value] ?? value
  if (!Icon) return null
  return (
    <span
      className="group/amenity relative flex size-6 items-center justify-center rounded-full border border-glass-border bg-surface text-text-secondary transition-colors duration-200 hover:border-neon-cyan/50 hover:text-neon-cyan"
      tabIndex={0}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      <span className="sr-only">{label}</span>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 w-max max-w-[160px] -translate-x-1/2 scale-95 rounded-md bg-deep px-2 py-1 text-center text-[10.5px] font-medium text-white opacity-0 shadow-lg transition-all duration-150 group-hover/amenity:scale-100 group-hover/amenity:opacity-100 group-focus-visible/amenity:scale-100 group-focus-visible/amenity:opacity-100"
      >
        {label}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-deep" />
      </span>
    </span>
  )
}

/**
 * Carrusel de hasta 6 propiedades de inversión, las más adecuadas según la
 * pre-evaluación en UF del cliente (ordenadas por cercanía de precio en el
 * backend, ver app/api/properties/recommendations/route.ts). El cliente
 * elige libremente cuántas propiedades quiere (1, 2, 4, 6...) con una
 * selección múltiple tipo checklist sobre cada tarjeta.
 *
 * Componente CONTROLADO: la selección vive en el padre (`selectedIds`/
 * `onToggle`) para que varios carruseles (uno por destino elegido, ver
 * PropertyPreferencesCard.tsx) puedan compartir un único set de propiedades
 * elegidas y un solo botón de "Confirmar selección" al final.
 */
function PropertyCarousel({
  title = "Propiedades para ti",
  description = "Selecciona una o más propiedades de la lista. Puedes revisar la galería de cada una antes de decidir.",
  properties,
  selectedIds,
  onToggle,
}: {
  title?: string
  description?: string
  properties: PropertyRecommendation[]
  selectedIds: Set<string>
  onToggle: (id: string) => void
}) {
  const [galleryProperty, setGalleryProperty] = React.useState<PropertyRecommendation | null>(null)
  const scrollerRef = React.useRef<HTMLDivElement>(null)

  if (properties.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-6">
        <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-text-tertiary">{title}</h2>
        <p className="mt-2 text-sm text-text-tertiary">
          No encontramos propiedades disponibles por ahora. Tu asesor te contactará con alternativas.
        </p>
      </div>
    )
  }

  function scrollBy(amount: number) {
    scrollerRef.current?.scrollBy({ left: amount, behavior: "smooth" })
  }

  return (
    <div className="glass-card flex flex-col gap-5 rounded-2xl p-6">
      <div>
        <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-text-tertiary">{title}</h2>
        <p className="mt-1 text-sm text-text-secondary">{description}</p>
      </div>

      <div className="relative">
        <div
          ref={scrollerRef}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:thin]"
        >
          {properties.map((property) => {
            const isSelected = selectedIds.has(property.id)
            const visibleAmenities = property.amenities.slice(0, MAX_VISIBLE_AMENITIES)
            const extraAmenityCount = property.amenities.length - visibleAmenities.length
            return (
              <button
                key={property.id}
                type="button"
                onClick={() => onToggle(property.id)}
                className={cn(
                  "interactive-lift flex w-64 shrink-0 snap-start flex-col overflow-hidden rounded-xl border text-left transition-colors duration-200",
                  isSelected ? "border-neon-cyan bg-neon-cyan/5" : "border-glass-border hover:border-neon-cyan/40"
                )}
              >
                <div className="relative">
                  {property.image ? (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation()
                        setGalleryProperty(property)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.stopPropagation()
                          setGalleryProperty(property)
                        }
                      }}
                      className="group relative block cursor-pointer"
                      aria-label={`Ver galería de ${property.name}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={property.image}
                        alt={`Imagen de ${property.name}`}
                        className="h-36 w-full object-cover"
                      />
                      <span className="absolute inset-0 flex items-center justify-center gap-1 bg-black/0 text-[11px] font-medium text-white opacity-0 transition-all duration-200 group-hover:bg-black/40 group-hover:opacity-100">
                        <Images className="size-3.5" /> Ver galería
                      </span>
                    </span>
                  ) : (
                    <div className="h-36 w-full bg-surface-elevated" />
                  )}
                  <span
                    className={cn(
                      "absolute right-2 top-2 flex size-6 items-center justify-center rounded-full border",
                      isSelected ? "border-neon-cyan bg-neon-cyan text-deep" : "border-glass-border bg-deep/70"
                    )}
                  >
                    {isSelected && <Check className="size-4" />}
                  </span>
                </div>
                <div className="flex flex-col gap-1.5 p-3">
                  <p className="text-xs font-medium text-text-primary">{property.name}</p>
                  <p className="flex items-center gap-1 text-[11px] text-text-secondary">
                    <MapPin className="size-3 text-neon-cyan" />
                    {property.comuna}
                  </p>
                  <p className="text-xs font-semibold text-text-primary">{property.priceUf} UF</p>
                  <div className="flex flex-wrap gap-1.5 text-[11px] text-text-tertiary">
                    {property.propertyType && (
                      <span className="inline-flex items-center gap-1">
                        <Home className="size-3" />
                        {property.propertyType === "casa" ? "Casa" : "Departamento"}
                      </span>
                    )}
                    {property.bedrooms != null && (
                      <span className="inline-flex items-center gap-1">
                        <BedDouble className="size-3" />
                        {property.bedrooms}
                      </span>
                    )}
                    {property.bathrooms != null && (
                      <span className="inline-flex items-center gap-1">
                        <Bath className="size-3" />
                        {property.bathrooms}
                      </span>
                    )}
                  </div>
                  {property.amenities.length > 0 && (
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {visibleAmenities.map((amenity) => (
                        <AmenityBadge key={amenity} value={amenity} />
                      ))}
                      {extraAmenityCount > 0 && (
                        <span className="flex size-6 items-center justify-center rounded-full border border-glass-border text-[10px] font-semibold text-text-tertiary">
                          +{extraAmenityCount}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {properties.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => scrollBy(-280)}
              aria-label="Ver propiedades anteriores"
              className="absolute left-0 top-1/3 flex size-9 -translate-x-3 items-center justify-center rounded-full border border-glass-border bg-deep/90 text-text-secondary transition-colors duration-200 hover:text-text-primary"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollBy(280)}
              aria-label="Ver más propiedades"
              className="absolute right-0 top-1/3 flex size-9 translate-x-3 items-center justify-center rounded-full border border-glass-border bg-deep/90 text-text-secondary transition-colors duration-200 hover:text-text-primary"
            >
              <ChevronRight className="size-4" />
            </button>
          </>
        )}
      </div>

      <PropertyGalleryModal
        open={galleryProperty !== null}
        onOpenChange={(open) => !open && setGalleryProperty(null)}
        propertyName={galleryProperty?.name ?? ""}
        images={galleryProperty?.images ?? []}
        videoUrl={galleryProperty?.videoUrl ?? null}
      />
    </div>
  )
}

export { PropertyCarousel }
