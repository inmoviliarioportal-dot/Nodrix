"use client"

import * as React from "react"
import { Search, MapPin, Coins, Home, Bed, Bath, PlayCircle, X, Building2 } from "lucide-react"

import { Input } from "@/components/ui/input"
import { PROPERTY_AMENITY_LABELS } from "@/lib/property-amenities"
import { AMENITY_ICONS } from "@/components/dashboard/amenityIcons"

interface PropertyRow {
  id: string
  name: string
  comuna: string
  location: string | null
  unit_number: string | null
  price_uf: number
  purpose: string | null
  bedrooms: number | null
  bathrooms: number | null
  property_type: string | null
  available: boolean
  images: string[] | null
  floor_plan_url: string | null
  video_url: string | null
  target_destinations: string[] | null
  amenities: string[] | null
}

const PURPOSE_LABELS: Record<string, string> = {
  inversion: "Inversión",
  vivienda_propia: "Vivienda propia",
  ambos: "Ambos",
}

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  casa: "Casa",
  departamento: "Departamento",
}

const selectClassName =
  "bg-surface-elevated border-glass-border focus-visible:border-neon-cyan focus-visible:ring-neon-cyan/30 h-9 w-full rounded-md border px-3 text-sm text-text-primary outline-none focus-visible:ring-3 sm:w-auto"

function formatUf(value: number) {
  return `${value.toLocaleString("es-CL")} UF`
}

/**
 * Vista de SOLO LECTURA del inventario de propiedades para el asesor (y
 * admin/gerencia) -- a diferencia de /admin/properties (CRUD), acá no hay
 * ningún botón de crear/editar/eliminar. El asesor necesita poder buscar,
 * filtrar y navegar el catálogo completo con todo el detalle (dirección,
 * comuna, UF, ubicación, N° de depto, fotos, video) para orientar a sus
 * clientes durante el proceso, sin poder tocar los datos -- eso sigue
 * siendo exclusivo del equipo comercial en /admin/properties.
 */
export default function BackofficePropertiesPage() {
  const [properties, setProperties] = React.useState<PropertyRow[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [comunaFilter, setComunaFilter] = React.useState("")
  const [purposeFilter, setPurposeFilter] = React.useState("")
  const [typeFilter, setTypeFilter] = React.useState("")
  const [selected, setSelected] = React.useState<PropertyRow | null>(null)

  React.useEffect(() => {
    fetch("/api/backoffice/properties")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setProperties(data?.properties ?? []))
      .finally(() => setLoading(false))
  }, [])

  const comunas = React.useMemo(
    () => Array.from(new Set(properties.map((p) => p.comuna).filter(Boolean))).sort(),
    [properties]
  )

  const filtered = React.useMemo(() => {
    const term = search.trim().toLowerCase()
    return properties.filter((p) => {
      if (term && !p.name.toLowerCase().includes(term) && !p.comuna.toLowerCase().includes(term)) return false
      if (comunaFilter && p.comuna !== comunaFilter) return false
      if (purposeFilter && p.purpose !== purposeFilter) return false
      if (typeFilter && p.property_type !== typeFilter) return false
      return true
    })
  }, [properties, search, comunaFilter, purposeFilter, typeFilter])

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-heading text-xl font-semibold text-text-primary">Propiedades</h1>
        <p className="mt-1 text-sm text-text-tertiary">
          Catálogo completo del inventario cargado por el equipo comercial. Solo lectura.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-tertiary" aria-hidden="true" />
          <Input
            className="bg-surface-elevated border-glass-border pl-9"
            placeholder="Buscar por nombre o comuna..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className={selectClassName} value={comunaFilter} onChange={(e) => setComunaFilter(e.target.value)}>
          <option value="">Todas las comunas</option>
          {comunas.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select className={selectClassName} value={purposeFilter} onChange={(e) => setPurposeFilter(e.target.value)}>
          <option value="">Todos los propósitos</option>
          {Object.entries(PURPOSE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select className={selectClassName} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">Todos los tipos</option>
          {Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-text-tertiary">Cargando propiedades...</p>
      ) : filtered.length === 0 ? (
        <div className="glass-card flex flex-col items-center gap-2 rounded-2xl p-10 text-center">
          <Building2 className="size-8 text-text-tertiary" aria-hidden="true" />
          <p className="text-sm text-text-tertiary">No hay propiedades que calcen con estos filtros.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((property) => (
            <button
              key={property.id}
              type="button"
              onClick={() => setSelected(property)}
              className="glass-card group flex flex-col overflow-hidden rounded-2xl text-left transition-transform duration-200 hover:-translate-y-0.5"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-dark-tertiary">
                {property.images?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={property.images[0]}
                    alt={property.name}
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Home className="size-8 text-text-tertiary" aria-hidden="true" />
                  </div>
                )}
                {!property.available && (
                  <span className="absolute top-2 right-2 rounded-full bg-black/70 px-2 py-1 text-[10px] font-semibold text-white">
                    No disponible
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-1.5 p-4">
                <h3 className="font-heading text-[14.5px] font-semibold text-text-primary">{property.name}</h3>
                <p className="flex items-center gap-1 text-xs text-text-tertiary">
                  <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                  {property.location || property.comuna}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-text-secondary">
                  <span className="flex items-center gap-1 font-semibold text-neon-cyan">
                    <Coins className="size-3.5" aria-hidden="true" />
                    {formatUf(property.price_uf)}
                  </span>
                  {property.bedrooms != null && (
                    <span className="flex items-center gap-1">
                      <Bed className="size-3.5" aria-hidden="true" />
                      {property.bedrooms}
                    </span>
                  )}
                  {property.bathrooms != null && (
                    <span className="flex items-center gap-1">
                      <Bath className="size-3.5" aria-hidden="true" />
                      {property.bathrooms}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && <PropertyDetailModal property={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

function PropertyDetailModal({ property, onClose }: { property: PropertyRow; onClose: () => void }) {
  const images = property.images ?? []

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="glass-card flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-glass-border p-4">
          <h2 className="font-heading text-base font-semibold text-text-primary">{property.name}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex size-8 items-center justify-center rounded-full text-text-tertiary transition-colors duration-200 hover:text-text-primary"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {images.length > 0 && (
            <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
              {images.map((src, i) => (
                <div key={src + i} className="relative size-28 shrink-0 overflow-hidden rounded-lg bg-dark-tertiary">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`${property.name} ${i + 1}`} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          )}

          {property.video_url && (
            <a
              href={property.video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-4 flex items-center gap-2 rounded-lg border border-glass-border bg-surface-elevated px-3 py-2 text-sm font-medium text-neon-cyan transition-colors duration-200 hover:bg-white/5"
            >
              <PlayCircle className="size-4" aria-hidden="true" />
              Ver video de la propiedad
            </a>
          )}

          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DetailField label="Dirección / ubicación" value={property.location || "—"} />
            <DetailField label="Comuna" value={property.comuna || "—"} />
            <DetailField label="Precio" value={formatUf(property.price_uf)} />
            <DetailField label="N° de departamento / unidad" value={property.unit_number || "—"} />
            <DetailField
              label="Tipo"
              value={property.property_type ? PROPERTY_TYPE_LABELS[property.property_type] ?? property.property_type : "—"}
            />
            <DetailField
              label="Propósito"
              value={property.purpose ? PURPOSE_LABELS[property.purpose] ?? property.purpose : "—"}
            />
            <DetailField label="Dormitorios" value={property.bedrooms != null ? String(property.bedrooms) : "—"} />
            <DetailField label="Baños" value={property.bathrooms != null ? String(property.bathrooms) : "—"} />
            <DetailField label="Disponibilidad" value={property.available ? "Disponible" : "No disponible"} />
          </dl>

          {property.floor_plan_url && (
            <a
              href={property.floor_plan_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block text-sm font-medium text-neon-cyan underline underline-offset-2"
            >
              Ver plano
            </a>
          )}

          {(property.amenities ?? []).length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold tracking-wide text-text-tertiary uppercase">Servicios</p>
              <div className="flex flex-wrap gap-2">
                {(property.amenities ?? []).map((amenity) => {
                  const Icon = AMENITY_ICONS[amenity as keyof typeof AMENITY_ICONS]
                  return (
                    <span
                      key={amenity}
                      className="flex items-center gap-1.5 rounded-full border border-glass-border bg-surface-elevated px-2.5 py-1 text-xs text-text-secondary"
                    >
                      {Icon && <Icon className="size-3.5" aria-hidden="true" />}
                      {PROPERTY_AMENITY_LABELS[amenity] ?? amenity}
                    </span>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold tracking-wide text-text-tertiary uppercase">{label}</dt>
      <dd className="mt-0.5 text-sm text-text-primary">{value}</dd>
    </div>
  )
}
