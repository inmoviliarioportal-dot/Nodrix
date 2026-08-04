"use client"

import * as React from "react"
import { toast } from "sonner"
import { Home, Building2, KeyRound, Timer, Heart, Lock, ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { SelectableCard } from "@/components/wizard/SelectableCard"
import { RegionComunaSelect } from "@/components/wizard/RegionComunaSelect"
import { PropertyCarousel, type PropertyRecommendation } from "@/components/dashboard/PropertyCarousel"
import { HousingPropertyList } from "@/components/dashboard/HousingPropertyList"
import { ProximityProfileForm, type ProximityProfile } from "@/components/dashboard/ProximityProfileForm"

interface PropertyCarouselGroup {
  destination: string
  label: string
  properties: PropertyRecommendation[]
}

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

/** Ícono por destino para el encabezado de cada carrusel (ver PropertyCarousel).
 * No usamos el logo real de Airbnb (marca registrada) -- KeyRound genérico
 * transmite "arriendo corto/temporal" igual que en la referencia. */
const DESTINATION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  vivir: Home,
  airbnb: KeyRound,
  alquiler_tradicional: Building2,
  venta_corto_plazo: Timer,
}

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
  destinations,
  onAccepted,
}: {
  purpose: Purpose
  applicationId: string
  mode: Mode
  /** Solo relevante en mode="investment" -- el cliente puede elegir más de un
   * destino (ej. Airbnb + Alquiler tradicional), ver tipo `PropertyDestination`
   * arriba. */
  destinations?: PropertyDestination[]
  onAccepted: () => void
}) {
  const [propertyType, setPropertyType] = React.useState<PropertyType | null>(null)
  const [bedrooms, setBedrooms] = React.useState<number | null>(null)
  const [bathrooms, setBathrooms] = React.useState<number | null>(null)
  const [comuna, setComuna] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isAccepting, setIsAccepting] = React.useState(false)
  const [carouselGroups, setCarouselGroups] = React.useState<PropertyCarouselGroup[] | null>(null)
  // Selección COMPARTIDA entre todos los carruseles (uno por destino
  // elegido) -- el cliente puede elegir propiedades de más de un carrusel
  // antes de confirmar todo junto con un solo botón.
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [housingProperties, setHousingProperties] = React.useState<PropertyRecommendation[] | null>(null)

  // Airbnb/venta a corto plazo piden el perfilamiento de proximidad ANTES
  // del carrusel -- ver ProximityProfileForm.tsx. `null` = aún no lo llenó
  // (y no aplica si destination no es una de estas dos).
  const requiresProximityProfile = (destinations ?? []).some((d) => d === "airbnb" || d === "venta_corto_plazo")
  const [proximityProfile, setProximityProfile] = React.useState<ProximityProfile | null>(null)

  const requestedCarousel = React.useRef(false)

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

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
            destinations,
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
        setCarouselGroups(data?.carousels ?? [])
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
      // Igual que en el carrusel de inversión: solo deben ofrecerse
      // propiedades cuyo precio en UF sea <= al presupuesto real del cliente
      // (pre-evaluación), no cualquier inmueble de la comuna.
      const bandsRes = await fetch(`/api/applications/${applicationId}/proposal-bands`)
      const bandsData = bandsRes.ok ? await bandsRes.json() : null
      const budgetUf = bandsData?.ufPreEvaluation?.estimatedPropertyValueUF as number | undefined

      const res = await fetch("/api/properties/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comuna,
          purpose: "vivienda_propia",
          propertyType: propertyType ?? undefined,
          bedrooms: bedrooms ?? undefined,
          bathrooms: bathrooms ?? undefined,
          budgetUf,
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

  async function handleAcceptInvestmentSelection() {
    if (selectedIds.size === 0) return
    setIsAccepting(true)
    try {
      const res = await fetch(`/api/applications/${applicationId}/accept-property-proposal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departmentCount: selectedIds.size,
          propertyIds: Array.from(selectedIds),
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
    if (!carouselGroups) {
      return (
        <div className="glass-card flex flex-col items-center gap-3 rounded-2xl p-6">
          <p className="text-sm text-text-tertiary">Buscando las propiedades más adecuadas para ti...</p>
        </div>
      )
    }
    // Un carrusel POR CADA destino que el cliente eligió (ej. Airbnb +
    // Alquiler tradicional) -- comparten un solo set de selección y un solo
    // botón de confirmación al final, para que el cliente vea claramente
    // qué opciones calzan con cada objetivo antes de decidir. Footer sticky
    // inferior con el resumen de selección + CTA, igual a la referencia.
    return (
      <div className="flex flex-col gap-8 pb-28">
        {carouselGroups.map((group) => (
          <PropertyCarousel
            key={group.destination}
            title={`Para ${group.label.toLowerCase()}`}
            description="Selecciona al menos una propiedad. Puedes revisar la galería de cada una antes de decidir."
            icon={DESTINATION_ICONS[group.destination] ?? Home}
            properties={group.properties}
            selectedIds={selectedIds}
            onToggle={toggleSelected}
          />
        ))}

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-glass-border bg-white/95 backdrop-blur-sm">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-neon-cyan/10 text-neon-cyan">
                <Heart className={selectedIds.size > 0 ? "size-4.5 fill-current" : "size-4.5"} aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-bold text-text-primary">
                  {selectedIds.size} {selectedIds.size === 1 ? "propiedad seleccionada" : "propiedades seleccionadas"}
                </p>
                <p className="text-xs text-text-tertiary">Puedes elegir más si lo deseas.</p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-1.5 sm:items-end">
              <Button
                className="glow-cyan w-full gap-2 rounded-full bg-neon-cyan px-6 text-white hover:bg-neon-cyan/90 sm:w-fit"
                disabled={selectedIds.size === 0 || isAccepting}
                onClick={handleAcceptInvestmentSelection}
              >
                {isAccepting ? "Guardando..." : "Continuar con estas propiedades"}
                {!isAccepting && <ArrowRight className="size-4" aria-hidden="true" />}
              </Button>
              <p className="hidden items-center gap-1 text-[11px] text-text-tertiary sm:flex">
                <Lock className="size-3" aria-hidden="true" />
                Si luego quieres cambiar tus opciones, podrás hacerlo con tu asesor.
              </p>
            </div>
          </div>
        </div>
      </div>
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
