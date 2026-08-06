import { Building2, Home } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export interface SelectedPropertyRow {
  id: string
  name: string
  comuna: string | null
  priceUf: number | null
  image: string | null
  /** Categoría/destino bajo el que el CLIENTE eligió esta propiedad (ver
   * migración 038). `null` en solicitudes anteriores a esa migración y en la
   * propiedad de vivienda propia, que no se elige desde un carrusel. */
  destination: string | null
  isHousing: boolean
}

/** Etiquetas legibles de cada destino -- mismos códigos que declara el
 * cliente en el flujo de perfilamiento (ver lib/wizard-storage.ts). */
const DESTINATION_LABELS: Record<string, string> = {
  vivir: "Para vivir",
  airbnb: "Airbnb",
  alquiler_tradicional: "Alquiler tradicional",
  venta_corto_plazo: "Venta a corto plazo",
}

const DESTINATION_CLASS: Record<string, string> = {
  vivir: "border-neon-green/40 bg-neon-green/10 text-neon-green",
  airbnb: "border-neon-purple/40 bg-neon-purple/10 text-neon-purple",
  alquiler_tradicional: "border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan",
  venta_corto_plazo: "border-gold/40 bg-gold/10 text-gold",
}

/**
 * Propiedades que el cliente eligió durante el flujo de propuestas, CON la
 * categoría/destino bajo la que eligió cada una. El destino es el dato que
 * el asesor necesita para evaluar: la misma propiedad puede servir para
 * Airbnb o para alquiler tradicional, y el criterio de aprobación cambia
 * según cuál declaró el cliente.
 */
function SelectedPropertiesSection({ properties }: { properties: SelectedPropertyRow[] }) {
  return (
    <Card className="glass-card border-glass-border">
      <CardHeader>
        <CardTitle>Propiedades elegidas por el cliente</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {properties.length === 0 ? (
          <p className="text-sm text-text-tertiary">
            El cliente aún no ha seleccionado propiedades en su flujo de propuestas.
          </p>
        ) : (
          properties.map((property) => (
            <div
              key={property.id}
              className="flex items-center gap-3 rounded-lg border border-glass-border bg-glass p-3"
            >
              {property.image ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={property.image}
                  alt=""
                  className="size-12 shrink-0 rounded-md object-cover"
                />
              ) : (
                <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-surface-elevated text-text-tertiary">
                  <Building2 className="size-5" aria-hidden="true" />
                </span>
              )}

              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium text-text-primary">{property.name}</span>
                <span className="text-xs text-text-tertiary">
                  {property.comuna ?? "Sin comuna"}
                  {property.priceUf != null && ` · ${property.priceUf.toLocaleString("es-CL")} UF`}
                </span>
              </div>

              {property.isHousing ? (
                <span className="flex shrink-0 items-center gap-1 rounded-full border border-neon-green/40 bg-neon-green/10 px-2 py-0.5 text-xs font-medium text-neon-green">
                  <Home className="size-3" aria-hidden="true" />
                  Vivienda propia
                </span>
              ) : property.destination ? (
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${
                    DESTINATION_CLASS[property.destination] ?? "border-glass-border text-text-secondary"
                  }`}
                >
                  {DESTINATION_LABELS[property.destination] ?? property.destination}
                </span>
              ) : (
                <span
                  className="shrink-0 rounded-full border border-glass-border px-2 py-0.5 text-xs font-medium text-text-tertiary"
                  title="Esta solicitud es anterior al registro de categoría por propiedad."
                >
                  Sin categoría
                </span>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

export { SelectedPropertiesSection }
