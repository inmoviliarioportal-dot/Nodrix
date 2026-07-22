"use client"

import * as React from "react"
import { toast } from "sonner"
import { Home, Building2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { SelectableCard } from "@/components/wizard/SelectableCard"
import {
  PropertyRecommendations,
  type PropertyProposal,
} from "@/components/dashboard/PropertyRecommendations"

type PropertyType = "casa" | "departamento"
type Purpose = "inversion" | "vivienda_propia" | "ambos"

const BEDROOM_OPTIONS = [1, 2, 3, 4] as const
const BATHROOM_OPTIONS = [1, 2, 3] as const

/**
 * Formulario de preferencias de vivienda (tipo, dormitorios, baños, comuna)
 * que se muestra tras elegir la propuesta inicial -- ahora aplica a TODOS
 * los purposes (inversión, vivienda_propia, ambos): elegir entre 1/2/3
 * departamentos es una decisión de tamaño de inversión que también aplica a
 * inversionistas puros. Para inversión pura se omite la pregunta de "tipo de
 * propiedad" (no aplica bien conceptualmente), pero se sigue pidiendo comuna.
 *
 * Al enviar, consulta POST /api/properties/recommendations (devuelve 3
 * propuestas seleccionables) y, al aceptar una, llama
 * POST /api/applications/[id]/accept-property-proposal antes de avisar al
 * padre vía `onAccepted`.
 */
function PropertyPreferencesCard({
  purpose,
  applicationId,
  onAccepted,
}: {
  purpose: Purpose
  applicationId: string
  onAccepted: () => void
}) {
  const [propertyType, setPropertyType] = React.useState<PropertyType | null>(null)
  const [bedrooms, setBedrooms] = React.useState<number | null>(null)
  const [bathrooms, setBathrooms] = React.useState<number | null>(null)
  const [comuna, setComuna] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isAccepting, setIsAccepting] = React.useState(false)
  const [proposals, setProposals] = React.useState<PropertyProposal[] | null>(null)

  const showPropertyTypeQuestion = purpose !== "inversion"

  async function handleSubmit() {
    if (!comuna.trim()) {
      toast.error("Ingresa una comuna para buscar propiedades.")
      return
    }
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/properties/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comuna: comuna.trim(),
          purpose,
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
      setProposals(data?.proposals ?? [])
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleAccept(proposal: PropertyProposal) {
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

  if (proposals) {
    return <PropertyRecommendations proposals={proposals} onAccept={handleAccept} isSubmitting={isAccepting} />
  }

  return (
    <div className="glass-card flex flex-col gap-5 rounded-2xl p-6">
      <div>
        <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-text-tertiary">
          Cuéntanos qué buscas
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Con estas preferencias te mostramos propiedades específicas que podrían interesarte.
        </p>
      </div>

      {showPropertyTypeQuestion && (
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
      )}

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
        <input
          type="text"
          value={comuna}
          onChange={(e) => setComuna(e.target.value)}
          placeholder="Ej: Ñuñoa"
          className="h-10 w-full rounded-lg border border-glass-border bg-deep px-3 text-sm text-text-primary outline-none"
        />
      </div>

      <Button disabled={isSubmitting} onClick={handleSubmit} className="self-center">
        {isSubmitting ? "Buscando..." : "Ver propuestas"}
      </Button>
    </div>
  )
}

export { PropertyPreferencesCard }
