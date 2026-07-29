"use client"

import * as React from "react"
import { Landmark, Palmtree, Building2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface ProximityProfile {
  historic: boolean
  tourist: boolean
  business: boolean
}

/**
 * Perfilamiento de proximidad para clientes que buscan Airbnb o venta a
 * corto plazo: los 4 parámetros mínimos que buscan estos clientes son
 * cercanía a casco histórico/céntrico, a zona turística, a negocios/sector
 * financiero, y presupuesto (el 4to ya se resuelve solo con la
 * pre-evaluación en UF -- ver lib/uf-preevaluation.ts). Las respuestas
 * ordenan/priorizan el carrusel de propiedades (ver
 * app/api/properties/recommendations/route.ts).
 */
function ProximityProfileForm({
  onSubmit,
  isSubmitting,
}: {
  onSubmit: (profile: ProximityProfile) => void
  isSubmitting?: boolean
}) {
  const [historic, setHistoric] = React.useState(false)
  const [tourist, setTourist] = React.useState(false)
  const [business, setBusiness] = React.useState(false)

  const options = [
    {
      key: "historic" as const,
      label: "Cercano a casco histórico o céntrico",
      icon: Landmark,
      checked: historic,
      toggle: () => setHistoric((v) => !v),
    },
    {
      key: "tourist" as const,
      label: "Cerca de zona turística",
      icon: Palmtree,
      checked: tourist,
      toggle: () => setTourist((v) => !v),
    },
    {
      key: "business" as const,
      label: "Cerca de negocios y sector financiero",
      icon: Building2,
      checked: business,
      toggle: () => setBusiness((v) => !v),
    },
  ]

  return (
    <div className="glass-card flex flex-col gap-5 rounded-2xl p-6">
      <div>
        <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-text-tertiary">
          Perfilemos tu renting ideal
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Selecciona lo que más te importa para maximizar tu rentabilidad. Puedes elegir más de una opción.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {options.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={opt.toggle}
            className={cn(
              "flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors duration-200",
              opt.checked ? "border-neon-cyan bg-neon-cyan/5 text-text-primary" : "border-glass-border text-text-secondary hover:border-neon-cyan/40"
            )}
          >
            <opt.icon className="size-4 shrink-0 text-neon-cyan" aria-hidden="true" />
            {opt.label}
          </button>
        ))}
      </div>

      <Button
        className="glow-cyan w-fit self-center gap-2 bg-neon-cyan text-deep hover:bg-neon-cyan/90"
        disabled={isSubmitting}
        onClick={() => onSubmit({ historic, tourist, business })}
      >
        {isSubmitting ? "Buscando..." : "Ver propiedades"}
      </Button>
    </div>
  )
}

export { ProximityProfileForm }
