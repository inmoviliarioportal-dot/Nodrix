"use client"

import * as React from "react"
import { MapPin, BedDouble, Bath, Home, Check, Images } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { PropertyGalleryModal } from "@/components/dashboard/PropertyGalleryModal"

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
}

export interface PropertyProposal {
  departmentCount: 1 | 2 | 3
  properties: PropertyRecommendation[]
}

const DEPARTMENT_COUNT_LABEL: Record<1 | 2 | 3, string> = {
  1: "1 departamento",
  2: "2 departamentos",
  3: "3 departamentos",
}

/**
 * Muestra las 3 propuestas (1/2/3 departamentos) armadas según las
 * preferencias del cliente en `PropertyPreferencesCard`. A diferencia del
 * flujo anterior (informativo), acá el cliente DEBE elegir una propuesta
 * (tarjeta seleccionable, patrón calcado de `SelectableCard`) antes de
 * poder aceptar y continuar.
 */
function PropertyRecommendations({
  proposals,
  onAccept,
  isSubmitting,
}: {
  proposals: PropertyProposal[]
  onAccept: (proposal: PropertyProposal) => void
  isSubmitting?: boolean
}) {
  const [selected, setSelected] = React.useState<1 | 2 | 3 | null>(null)
  const [galleryProperty, setGalleryProperty] = React.useState<PropertyRecommendation | null>(null)

  const hasAnyProperty = proposals.some((p) => p.properties.length > 0)

  if (!hasAnyProperty) {
    return (
      <div className="glass-card rounded-2xl p-6">
        <p className="text-sm text-text-tertiary">
          No encontramos propiedades que coincidan con tus preferencias por ahora. Tu asesor te contactará con
          alternativas.
        </p>
      </div>
    )
  }

  const selectedProposal = proposals.find((p) => p.departmentCount === selected) ?? null

  return (
    <div className="glass-card flex flex-col gap-5 rounded-2xl p-6">
      <div>
        <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-text-tertiary">
          Elige tu propuesta
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Según tus preferencias, arma tu propuesta ideal eligiendo entre 1, 2 o 3 departamentos.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {proposals.map((proposal) => {
          if (proposal.properties.length === 0) return null
          const isSelected = selected === proposal.departmentCount
          return (
            <button
              key={proposal.departmentCount}
              type="button"
              onClick={() => setSelected(proposal.departmentCount)}
              className={cn(
                "flex flex-col gap-3 rounded-xl border p-4 text-left transition-colors duration-200",
                isSelected
                  ? "border-neon-cyan bg-neon-cyan/5"
                  : "border-glass-border hover:border-neon-cyan/40"
              )}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-text-primary">
                  {DEPARTMENT_COUNT_LABEL[proposal.departmentCount]}
                </p>
                <div
                  className={cn(
                    "flex size-5 items-center justify-center rounded-full border",
                    isSelected ? "border-neon-cyan bg-neon-cyan text-deep" : "border-glass-border"
                  )}
                >
                  {isSelected && <Check className="size-3.5" />}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {proposal.properties.map((property, idx) => (
                  <div
                    key={`${property.id}-${idx}`}
                    className="flex flex-col overflow-hidden rounded-xl border border-glass-border bg-surface-elevated"
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
                        <img
                          src={property.image}
                          alt={`Imagen de ${property.name}`}
                          className="h-28 w-full object-cover"
                        />
                        <span className="absolute inset-0 flex items-center justify-center gap-1 bg-black/0 text-[11px] font-medium text-white opacity-0 transition-all duration-200 group-hover:bg-black/40 group-hover:opacity-100">
                          <Images className="size-3.5" /> Ver galería
                        </span>
                      </span>
                    )}
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
                    </div>
                  </div>
                ))}
              </div>
            </button>
          )
        })}
      </div>

      <Button
        className="glow-cyan w-fit self-center bg-neon-cyan text-deep hover:bg-neon-cyan/90"
        disabled={!selectedProposal || isSubmitting}
        onClick={() => selectedProposal && onAccept(selectedProposal)}
      >
        {isSubmitting ? "Guardando..." : "Aceptar esta propuesta"}
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

export { PropertyRecommendations }
