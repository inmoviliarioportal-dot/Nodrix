"use client"

import * as React from "react"
import { MapPin, BedDouble, Bath, Home, Check, Images } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { PropertyRecommendation } from "@/components/dashboard/PropertyRecommendations"
import { PropertyGalleryModal } from "@/components/dashboard/PropertyGalleryModal"

/**
 * Lista de propiedades INDIVIDUALES para el flujo de vivienda propia -- a
 * diferencia de PropertyRecommendations (bundles de 1/2/3 departamentos
 * para inversión), acá el cliente elige UN solo inmueble para vivir.
 */
function HousingPropertyList({
  properties,
  onAccept,
  onSkip,
  isSubmitting,
}: {
  properties: PropertyRecommendation[]
  onAccept: (property: PropertyRecommendation) => void
  /** Deja continuar el flujo aunque no haya elegido (o no exista) ninguna
   * propiedad de vivienda -- el cliente no debe quedar bloqueado sin salida
   * si el inventario disponible no calza con sus preferencias. */
  onSkip: () => void
  isSubmitting?: boolean
}) {
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [galleryProperty, setGalleryProperty] = React.useState<PropertyRecommendation | null>(null)

  if (properties.length === 0) {
    return (
      <div className="glass-card flex flex-col items-center gap-4 rounded-2xl p-6 text-center">
        <p className="text-sm text-text-tertiary">
          No encontramos propiedades que coincidan con tus preferencias por ahora. Tu asesor te contactará con
          alternativas.
        </p>
        <Button variant="outline" onClick={onSkip}>
          Continuar sin seleccionar por ahora
        </Button>
      </div>
    )
  }

  const selectedProperty = properties.find((p) => p.id === selectedId) ?? null

  return (
    <div className="glass-card flex flex-col gap-5 rounded-2xl p-6">
      <div>
        <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-text-tertiary">
          Elige tu propiedad
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Según tus preferencias, estas son las propiedades disponibles para vivienda propia.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {properties.map((property, idx) => {
          const isSelected = selectedId === property.id
          return (
            <button
              key={`${property.id}-${idx}`}
              type="button"
              onClick={() => setSelectedId(property.id)}
              className={cn(
                "flex flex-col overflow-hidden rounded-xl border text-left transition-colors duration-200",
                isSelected ? "border-neon-cyan bg-neon-cyan/5" : "border-glass-border hover:border-neon-cyan/40"
              )}
            >
              {property.image && (
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
                  <img src={property.image} alt={`Imagen de ${property.name}`} className="h-32 w-full object-cover" />
                  <span className="absolute inset-0 flex items-center justify-center gap-1 bg-black/0 text-xs font-medium text-white opacity-0 transition-all duration-200 group-hover:bg-black/40 group-hover:opacity-100">
                    <Images className="size-4" /> Ver galería
                  </span>
                </span>
              )}
              <div className="flex flex-col gap-1.5 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-text-primary">{property.name}</p>
                  <div
                    className={cn(
                      "flex size-5 items-center justify-center rounded-full border",
                      isSelected ? "border-neon-cyan bg-neon-cyan text-deep" : "border-glass-border"
                    )}
                  >
                    {isSelected && <Check className="size-3.5" />}
                  </div>
                </div>
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
              </div>
            </button>
          )
        })}
      </div>

      <Button
        className="glow-cyan w-fit self-center bg-neon-cyan text-deep hover:bg-neon-cyan/90"
        disabled={!selectedProperty || isSubmitting}
        onClick={() => selectedProperty && onAccept(selectedProperty)}
      >
        {isSubmitting ? "Guardando..." : "Aceptar esta propiedad"}
      </Button>

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

export { HousingPropertyList }
