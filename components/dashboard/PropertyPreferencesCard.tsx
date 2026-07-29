"use client"

import * as React from "react"
import { toast } from "sonner"
import { Home, Building2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { SelectableCard } from "@/components/wizard/SelectableCard"
import { RegionComunaSelect } from "@/components/wizard/RegionComunaSelect"
import { PropertyCarousel, type PropertyRecommendation } from "@/components/dashboard/PropertyCarousel"
import { HousingPropertyList } from "@/components/dashboard/HousingPropertyList"
import { ProximityProfileForm, type ProximityProfile } from "@/components/dashboard/ProximityProfileForm"

type PropertyType = "casa" | "departamento"
type Purpose = "inversion" | "vivienda_propia" | "ambos"
type Mode = "investment" | "housing"
/** Destino declarado en el wizard -- ver lib/wizard-storage.ts. Solo relevante
 * en mode="investment": airbnb/venta_corto_plazo piden un perfilamiento de
 * proximidad antes de mostrar el carrusel; alquiler_tradicional (y el resto)
 * van directo al carrusel, igual que antes. */
type PropertyDestination = "vivir" | "airbnb" | "alquiler_tradicional" | "venta_corto_plazo"

const BEDROOM_OPTIONS = [1, 2, 3, 4] as const
const BATHROOM_OPTIONS = [1, 2, 3] as const

/**
 * Tarjeta de propuesta de propiedades, con dos modos completamente
 * distintos según el `purpose` del cliente (ver app/onboarding/initial-proposal/page.tsx):
 *
 * - mode="investment": SIN formulario de preferencias -- va directo a mostrar
 *   un carrusel de hasta 8 propiedades (las más adecuadas según la
 *   pre-evaluación en UF), donde el cliente elige libremente cuántas quiere
 *   (ver PropertyCarousel.tsx). Se usa para purpose "inversion" y como
 *   PRIMER paso de "ambos".
 * - mode="housing": muestra el formulario de preferencias (tipo, dormitorios,
 *   baños, región+comuna) y, al enviar, una lista de propiedades
 *   INDIVIDUALES (no bundles) para elegir una sola. Se usa para purpose
 *   "vivienda_propia" y como SEGUNDO paso de "ambos".
 */
function PropertyPreferencesCard({
  purpose,
  applicationId,
  mode,
  destination,
  onAccepted,
}: {
  purpose: Purpose
  applicationId: string
  mode: Mode
  /** Solo relevante en mode="investment" -- ver tipo `PropertyDestination` arriba. */
  destination?: PropertyDestination
  onAccepted: () => void
}) {
  const [propertyType, setPropertyType] = React.useState<PropertyType | null>(null)
  const [bedrooms, setBedrooms] = React.useState<number | null>(null)
  const [bathrooms, setBathrooms] = React.useState<number | null>(null)
  const [comuna, setComuna] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isAccepting, setIsAccepting] = React.useState(false)
  const [carousel, setCarousel] = React.useState<PropertyRecommendation[] | null>(null)
  const [housingProperties, setHousingProperties] = React.useState<PropertyRecommendation[] | null>(null)

  // Airbnb/venta a corto plazo piden el perfilamiento de proximidad ANTES
  // del carrusel -- ver ProximityProfileForm.tsx. `null` = aún no lo llenó
  // (y no aplica si destination no es una de estas dos).
  const requiresProximityProfile = destination === "airbnb" || destination === "venta_corto_plazo"
  const [proximityProfile, setProximityProfile] = React.useState<ProximityProfile | null>(null)

  const requestedCarousel = React.useRef(false)

  function fetchCarousel(profile: ProximityProfile | null) {
    setIsSubmitting(true)
    fetch(`/api/applications/${applicationId}/proposal-bands`)
      .then((res) => (res.ok ? res.json() : null))
      .then((bandsData) => {
        const budgetUf = bandsData?.ufPreEvaluation?.estimatedPropertyValueUF as number | undefined
        return fetch("/api/properties/recommendations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            purpose: "inversion",
            budgetUf,
            destination,
            profileHistoric: profile?.historic,
            profileTourist: profile?.tourist,
            profileBusiness: profile?.business,
          }),
        })
      })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => null)
          toast.error(data?.error ?? "No se pudieron buscar propiedades.")
          return
        }
        const data = await res.json()
        setCarousel(data?.carousel ?? [])
      })
      .finally(() => setIsSubmitting(false))
  }

  // mode="investment" sin perfilamiento de proximidad no pide preferencias --
  // dispara la búsqueda apenas se monta, una sola vez. Primero busca el
  // presupuesto en UF ya calculado (pre-evaluación) para que el carrusel
  // muestre las propiedades más cercanas al precio que el cliente realmente
  // puede pagar. Si requiere perfilamiento, espera a que el cliente lo
  // complete (ver handleProximityProfileSubmit).
  React.useEffect(() => {
    if (mode !== "investment" || requiresProximityProfile || requestedCarousel.current) return
    requestedCarousel.current = true
    fetchCarousel(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, applicationId, requiresProximityProfile])

  function handleProximityProfileSubmit(profile: ProximityProfile) {
    setProximityProfile(profile)
    requestedCarousel.current = true
    fetchCarousel(profile)
  }

  async function handleHousingSubmit() {
    if (!comuna) {
      toast.error("Selecciona una comuna para buscar propiedades.")
      return
    }
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/properties/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comuna,
          purpose: "vivienda_propia",
          propertyType: propertyType ?? undefined,
          bedrooms: bedrooms ?? undefined,
          bathrooms: bathrooms ?? undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        toast.error(data?.error ?? "No se pudieron buscar propiedades.")
        return
      }
      const data = await res.json()
      setHousingProperties(data?.recommendations ?? [])
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleAcceptInvestmentSelection(selected: PropertyRecommendation[]) {
    setIsAccepting(true)
    try {
      const res = await fetch(`/api/applications/${applicationId}/accept-property-proposal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departmentCount: selected.length,
          propertyIds: selected.map((p) => p.id),
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        toast.error(data?.error ?? "No se pudo aceptar la propuesta.")
        return
      }
      onAccepted()
    } finally {
      setIsAccepting(false)
    }
  }

  async function handleAcceptHousingProperty(property: PropertyRecommendation) {
    setIsAccepting(true)
    try {
      const res = await fetch(`/api/applications/${applicationId}/accept-housing-property`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId: property.id }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        toast.error(data?.error ?? "No se pudo aceptar la propiedad.")
        return
      }
      onAccepted()
    } finally {
      setIsAccepting(false)
    }
  }

  /** Cuando no hay ninguna propiedad de vivienda que calce con las
   * preferencias, el cliente igual debe poder seguir adelante -- el asesor
   * hace seguimiento manual después. No llama al endpoint de aceptación,
   * simplemente avanza (queda `accepted_housing_property_id` en null). */
  function handleSkipHousing() {
    onAccepted()
  }

  if (mode === "investment") {
    if (requiresProximityProfile && proximityProfile === null) {
      return <ProximityProfileForm onSubmit={handleProximityProfileSubmit} isSubmitting={isSubmitting} />
    }
    if (!carousel) {
      return (
        <div className="glass-card flex flex-col items-center gap-3 rounded-2xl p-6">
          <p className="text-sm text-text-tertiary">Buscando las propiedades más adecuadas para ti...</p>
        </div>
      )
    }
    return (
      <PropertyCarousel properties={carousel} onAccept={handleAcceptInvestmentSelection} isSubmitting={isAccepting} />
    )
  }

  // mode === "housing"
  if (housingProperties) {
    return (
      <HousingPropertyList
        properties={housingProperties}
        onAccept={handleAcceptHousingProperty}
        onSkip={handleSkipHousing}
        isSubmitting={isAccepting}
      />
    )
  }

  return (
    <div className="glass-card flex flex-col gap-5 rounded-2xl p-6">
      <div>
        <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-text-tertiary">
          Cuéntanos qué buscas para tu vivienda
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Con estas preferencias te mostramos propiedades específicas que podrían interesarte.
        </p>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-text-tertiary">Tipo de propiedad</p>
        <div className="grid grid-cols-2 gap-3">
          <SelectableCard
            label="Casa"
            icon={Home}
            selected={propertyType === "casa"}
            onClick={() => setPropertyType("casa")}
          />
          <SelectableCard
            label="Departamento"
            icon={Building2}
            selected={propertyType === "departamento"}
            onClick={() => setPropertyType("departamento")}
          />
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-text-tertiary">Dormitorios</p>
        <div className="flex flex-wrap gap-2">
          {BEDROOM_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setBedrooms(n)}
              className={`rounded-lg border px-4 py-2 text-sm transition-colors duration-200 ${
                bedrooms === n
                  ? "border-[color:var(--neon-cyan)] text-[color:var(--neon-cyan)]"
                  : "border-glass-border text-text-secondary hover:text-text-primary"
              }`}
            >
              {n === 4 ? "4+" : n}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-text-tertiary">Baños</p>
        <div className="flex flex-wrap gap-2">
          {BATHROOM_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setBathrooms(n)}
              className={`rounded-lg border px-4 py-2 text-sm transition-colors duration-200 ${
                bathrooms === n
                  ? "border-[color:var(--neon-cyan)] text-[color:var(--neon-cyan)]"
                  : "border-glass-border text-text-secondary hover:text-text-primary"
              }`}
            >
              {n === 3 ? "3+" : n}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-text-tertiary">Comuna</p>
        <RegionComunaSelect value={comuna} onChange={setComuna} />
      </div>

      <Button disabled={isSubmitting} onClick={handleHousingSubmit} className="self-center">
        {isSubmitting ? "Buscando..." : "Ver propiedades"}
      </Button>
    </div>
  )
}

export { PropertyPreferencesCard }
