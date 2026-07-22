"use client"

import * as React from "react"
import { toast } from "sonner"
import { Home, Building2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { SelectableCard } from "@/components/wizard/SelectableCard"
import { RegionComunaSelect } from "@/components/wizard/RegionComunaSelect"
import {
  PropertyRecommendations,
  type PropertyProposal,
  type PropertyRecommendation,
} from "@/components/dashboard/PropertyRecommendations"
import { HousingPropertyList } from "@/components/dashboard/HousingPropertyList"

type PropertyType = "casa" | "departamento"
type Purpose = "inversion" | "vivienda_propia" | "ambos"
type Mode = "investment" | "housing"

const BEDROOM_OPTIONS = [1, 2, 3, 4] as const
const BATHROOM_OPTIONS = [1, 2, 3] as const

/**
 * Tarjeta de propuesta de propiedades, con dos modos completamente
 * distintos según el `purpose` del cliente (ver app/onboarding/initial-proposal/page.tsx):
 *
 * - mode="investment": SIN formulario de preferencias -- va directo a pedir
 *   las 3 propuestas de 1/2/3 departamentos (misma lógica ya armada para
 *   inversión). Se usa para purpose "inversion" y como PRIMER paso de
 *   "ambos". El enfoque de preferencias para la pata de inversión pura
 *   queda pendiente para una iteración futura (instrucción del usuario).
 * - mode="housing": muestra el formulario de preferencias (tipo, dormitorios,
 *   baños, región+comuna) y, al enviar, una lista de propiedades
 *   INDIVIDUALES (no bundles) para elegir una sola. Se usa para purpose
 *   "vivienda_propia" y como SEGUNDO paso de "ambos".
 */
function PropertyPreferencesCard({
  purpose,
  applicationId,
  mode,
  onAccepted,
}: {
  purpose: Purpose
  applicationId: string
  mode: Mode
  onAccepted: () => void
}) {
  const [propertyType, setPropertyType] = React.useState<PropertyType | null>(null)
  const [bedrooms, setBedrooms] = React.useState<number | null>(null)
  const [bathrooms, setBathrooms] = React.useState<number | null>(null)
  const [comuna, setComuna] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isAccepting, setIsAccepting] = React.useState(false)
  const [proposals, setProposals] = React.useState<PropertyProposal[] | null>(null)
  const [housingProperties, setHousingProperties] = React.useState<PropertyRecommendation[] | null>(null)

  const requestedInvestmentProposals = React.useRef(false)

  // mode="investment" no pide preferencias -- dispara la búsqueda apenas se
  // monta, una sola vez.
  React.useEffect(() => {
    if (mode !== "investment" || requestedInvestmentProposals.current) return
    requestedInvestmentProposals.current = true
    setIsSubmitting(true)
    fetch("/api/properties/recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purpose: "inversion" }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => null)
          toast.error(data?.error ?? "No se pudieron buscar propiedades.")
          return
        }
        const data = await res.json()
        setProposals(data?.proposals ?? [])
      })
      .finally(() => setIsSubmitting(false))
  }, [mode])

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

  async function handleAcceptInvestmentProposal(proposal: PropertyProposal) {
    setIsAccepting(true)
    try {
      const res = await fetch(`/api/applications/${applicationId}/accept-property-proposal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departmentCount: proposal.departmentCount,
          propertyIds: proposal.properties.map((p) => p.id),
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
    if (!proposals) {
      return (
        <div className="glass-card flex flex-col items-center gap-3 rounded-2xl p-6">
          <p className="text-sm text-text-tertiary">Buscando propuestas de inversión...</p>
        </div>
      )
    }
    return (
      <PropertyRecommendations proposals={proposals} onAccept={handleAcceptInvestmentProposal} isSubmitting={isAccepting} />
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
