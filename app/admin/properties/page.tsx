"use client"

import * as React from "react"
import { toast } from "sonner"
import { UploadCloud, X, FileText, Video, Loader2 } from "lucide-react"

import { Toaster } from "@/components/ui/sonner"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { PROPERTY_AMENITIES } from "@/lib/property-amenities"
import { AMENITY_ICONS } from "@/components/dashboard/amenityIcons"

interface ChileRegionWithComunas {
  id: string
  name: string
  comunas: string[]
}

/** Sube uno o más archivos a POST /api/admin/properties/upload y devuelve
 * sus URLs públicas -- usado por los 3 tipos de carga (imágenes, plano,
 * video), ver ese endpoint para el detalle de validación por tipo. */
async function uploadPropertyFiles(kind: "image" | "floorPlan" | "video", files: FileList | File[]): Promise<string[]> {
  const formData = new FormData()
  formData.append("kind", kind)
  Array.from(files).forEach((file) => formData.append("files", file))

  const res = await fetch("/api/admin/properties/upload", { method: "POST", body: formData })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(data?.error ?? "No se pudo subir el archivo.")
  }
  return data.urls as string[]
}

interface PropertyRow {
  id: string
  name: string
  comuna: string
  location: string | null
  unit_number: string | null
  price_uf: number
  purpose: string | null
  available: boolean
  images: string[] | null
  floor_plan_url: string | null
  video_url: string | null
  near_historic_center: boolean
  near_tourist_zone: boolean
  near_business_district: boolean
  target_destinations: string[]
  amenities: string[]
}

const DESTINATION_OPTIONS = [
  { value: "vivir", label: "Vivienda" },
  { value: "airbnb", label: "Airbnb" },
  { value: "alquiler_tradicional", label: "Alquiler tradicional" },
  { value: "venta_corto_plazo", label: "Venta a corto plazo" },
]

const PURPOSE_OPTIONS = [
  { value: "inversion", label: "Inversión" },
  { value: "vivienda_propia", label: "Vivienda propia" },
  { value: "ambos", label: "Ambos" },
]

const PURPOSE_LABELS: Record<string, string> = {
  inversion: "Inversión",
  vivienda_propia: "Vivienda propia",
  ambos: "Ambos",
}

const selectClassName =
  "bg-surface-elevated border-glass-border focus-visible:border-neon-cyan focus-visible:ring-neon-cyan/30 h-9 w-full rounded-md border px-3 text-sm text-text-primary outline-none focus-visible:ring-3"

const EMPTY_FORM = {
  name: "",
  regionId: "",
  comuna: "",
  location: "",
  unitNumber: "",
  priceUf: "",
  purpose: "ambos",
  images: [] as string[],
  floorPlanUrl: "",
  videoUrl: "",
  nearHistoricCenter: false,
  nearTouristZone: false,
  nearBusinessDistrict: false,
  targetDestinations: [] as string[],
  amenities: [] as string[],
}

/**
 * Panel de administración del inventario de propiedades: el cliente en el
 * dashboard NUNCA ve este listado tal cual -- solo consume rangos de precio
 * agregados por comuna (ver /api/properties/offers). Acá es donde el
 * equipo comercial carga/edita las propiedades reales (comuna, precio,
 * propósito, imágenes referenciales, plano).
 */
export default function AdminPropertiesPage() {
  const [properties, setProperties] = React.useState<PropertyRow[]>([])
  const [regions, setRegions] = React.useState<ChileRegionWithComunas[]>([])
  const [loading, setLoading] = React.useState(true)
  const [form, setForm] = React.useState(EMPTY_FORM)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [uploadingImages, setUploadingImages] = React.useState(false)
  const [uploadingFloorPlan, setUploadingFloorPlan] = React.useState(false)
  const [uploadingVideo, setUploadingVideo] = React.useState(false)

  const load = React.useCallback(() => {
    setLoading(true)
    fetch("/api/admin/properties")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setProperties(data?.properties ?? []))
      .finally(() => setLoading(false))
  }, [])

  React.useEffect(() => {
    load()
    fetch("/api/regions/enabled")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setRegions(data?.regions ?? []))
      .catch(() => setRegions([]))
  }, [load])

  const comunaOptions = React.useMemo(
    () => regions.find((r) => r.id === form.regionId)?.comunas ?? [],
    [regions, form.regionId]
  )

  async function handleImagesSelected(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploadingImages(true)
    try {
      const urls = await uploadPropertyFiles("image", files)
      setForm((f) => ({ ...f, images: [...f.images, ...urls] }))
      toast.success(`${urls.length} imagen(es) subida(s).`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudieron subir las imágenes.")
    } finally {
      setUploadingImages(false)
    }
  }

  function removeImage(url: string) {
    setForm((f) => ({ ...f, images: f.images.filter((img) => img !== url) }))
  }

  async function handleFloorPlanSelected(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploadingFloorPlan(true)
    try {
      const [url] = await uploadPropertyFiles("floorPlan", [files[0]])
      setForm((f) => ({ ...f, floorPlanUrl: url }))
      toast.success("Plano subido.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo subir el plano.")
    } finally {
      setUploadingFloorPlan(false)
    }
  }

  async function handleVideoSelected(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploadingVideo(true)
    try {
      const [url] = await uploadPropertyFiles("video", [files[0]])
      setForm((f) => ({ ...f, videoUrl: url }))
      toast.success("Video subido.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo subir el video.")
    } finally {
      setUploadingVideo(false)
    }
  }

  function resetForm() {
    setForm(EMPTY_FORM)
    setEditingId(null)
  }

  function toggleDestination(value: string) {
    setForm((f) => ({
      ...f,
      targetDestinations: f.targetDestinations.includes(value)
        ? f.targetDestinations.filter((d) => d !== value)
        : [...f.targetDestinations, value],
    }))
  }

  function toggleAmenity(value: string) {
    setForm((f) => ({
      ...f,
      amenities: f.amenities.includes(value) ? f.amenities.filter((a) => a !== value) : [...f.amenities, value],
    }))
  }

  function startEdit(property: PropertyRow) {
    setEditingId(property.id)
    // La región no se guarda en `properties` (solo comuna) -- se infiere
    // buscando qué región contiene esta comuna, para preseleccionar el
    // combo en cascada al editar.
    const matchedRegion = regions.find((r) =>
      r.comunas.some((c) => c.toLowerCase() === property.comuna.toLowerCase())
    )
    setForm({
      name: property.name,
      regionId: matchedRegion?.id ?? "",
      comuna: property.comuna,
      location: property.location ?? "",
      unitNumber: property.unit_number ?? "",
      priceUf: String(property.price_uf),
      purpose: property.purpose ?? "ambos",
      images: property.images ?? [],
      floorPlanUrl: property.floor_plan_url ?? "",
      videoUrl: property.video_url ?? "",
      nearHistoricCenter: property.near_historic_center,
      nearTouristZone: property.near_tourist_zone,
      nearBusinessDistrict: property.near_business_district,
      targetDestinations: property.target_destinations ?? [],
      amenities: property.amenities ?? [],
    })
  }

  async function toggleAvailable(property: PropertyRow) {
    const res = await fetch(`/api/admin/properties/${property.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ available: !property.available }),
    })
    if (!res.ok) {
      toast.error("No se pudo actualizar la disponibilidad.")
      return
    }
    load()
  }

  async function remove(property: PropertyRow) {
    const res = await fetch(`/api/admin/properties/${property.id}`, { method: "DELETE" })
    if (!res.ok) {
      toast.error("No se pudo eliminar la propiedad.")
      return
    }
    toast.success(`"${property.name}" eliminada.`)
    load()
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const priceUf = Number(form.priceUf)
    if (!form.name.trim() || !form.comuna.trim() || !priceUf || priceUf <= 0) {
      toast.error("Completa nombre, comuna y un precio UF válido.")
      return
    }

    setIsSubmitting(true)
    try {
      const url = editingId ? `/api/admin/properties/${editingId}` : "/api/admin/properties"
      const method = editingId ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          comuna: form.comuna,
          location: form.location || form.comuna,
          unitNumber: form.unitNumber || null,
          priceUf,
          purpose: form.purpose,
          images: form.images,
          floorPlanUrl: form.floorPlanUrl || null,
          videoUrl: form.videoUrl || null,
          nearHistoricCenter: form.nearHistoricCenter,
          nearTouristZone: form.nearTouristZone,
          nearBusinessDistrict: form.nearBusinessDistrict,
          targetDestinations: form.targetDestinations,
          amenities: form.amenities,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        toast.error(data?.error ?? "No se pudo guardar la propiedad.")
        return
      }
      toast.success(editingId ? "Propiedad actualizada." : "Propiedad creada.")
      resetForm()
      load()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Toaster />
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold text-text-primary">Propiedades</h1>
        <p className="text-sm text-text-secondary">
          Inventario por comuna con precio UF, propósito e imágenes referenciales -- alimenta la oferta que ve el
          cliente en "Aprobado previo" (agregada por comuna, nunca como listado de propiedades específicas).
        </p>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="name">Nombre</FieldLabel>
              <Input
                id="name"
                className="bg-surface-elevated border-glass-border"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Edificio Vista Sur"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="region">Región</FieldLabel>
              <select
                id="region"
                className={selectClassName}
                value={form.regionId}
                onChange={(e) => setForm((f) => ({ ...f, regionId: e.target.value, comuna: "" }))}
              >
                <option value="">Selecciona una región</option>
                {regions.map((region) => (
                  <option key={region.id} value={region.id}>
                    {region.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field>
              <FieldLabel htmlFor="comuna">Comuna</FieldLabel>
              <select
                id="comuna"
                className={selectClassName}
                value={form.comuna}
                disabled={!form.regionId}
                onChange={(e) => setForm((f) => ({ ...f, comuna: e.target.value }))}
              >
                <option value="">{form.regionId ? "Selecciona una comuna" : "Elige primero una región"}</option>
                {comunaOptions.map((comuna) => (
                  <option key={comuna} value={comuna}>
                    {comuna}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="location">Ubicación (región/ciudad)</FieldLabel>
              <Input
                id="location"
                className="bg-surface-elevated border-glass-border"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="Ñuñoa, Santiago"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="priceUf">Precio (UF)</FieldLabel>
              <Input
                id="priceUf"
                type="number"
                min={0}
                className="bg-surface-elevated border-glass-border"
                value={form.priceUf}
                onChange={(e) => setForm((f) => ({ ...f, priceUf: e.target.value }))}
                placeholder="3200"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="purpose">Propósito</FieldLabel>
              <select
                id="purpose"
                className={selectClassName}
                value={form.purpose}
                onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))}
              >
                {PURPOSE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="unitNumber">N° de departamento/unidad</FieldLabel>
              <Input
                id="unitNumber"
                className="bg-surface-elevated border-glass-border"
                value={form.unitNumber}
                onChange={(e) => setForm((f) => ({ ...f, unitNumber: e.target.value }))}
                placeholder="Depto 402"
              />
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="images">Imágenes referenciales</FieldLabel>
            <p className="text-xs text-text-tertiary">Puedes seleccionar varias a la vez (carga masiva) o una por una.</p>
            <label
              htmlFor="images"
              className="border-glass-border bg-surface-elevated hover:border-neon-cyan/50 mt-1 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-4 text-sm text-text-secondary transition-colors duration-200"
            >
              {uploadingImages ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Subiendo...
                </>
              ) : (
                <>
                  <UploadCloud className="size-4" aria-hidden="true" />
                  Seleccionar imágenes (JPG/PNG/WEBP)
                </>
              )}
            </label>
            <input
              id="images"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              disabled={uploadingImages}
              onChange={(e) => {
                handleImagesSelected(e.target.files)
                e.target.value = ""
              }}
            />
            {form.images.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {form.images.map((url) => (
                  <div key={url} className="group relative size-20 shrink-0 overflow-hidden rounded-lg bg-dark-tertiary">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(url)}
                      aria-label="Quitar imagen"
                      className="absolute top-0.5 right-0.5 flex size-5 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                    >
                      <X className="size-3" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="floorPlanFile">Plano / distribución (opcional)</FieldLabel>
              <label
                htmlFor="floorPlanFile"
                className="border-glass-border bg-surface-elevated hover:border-neon-cyan/50 mt-1 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-3 text-sm text-text-secondary transition-colors duration-200"
              >
                {uploadingFloorPlan ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Subiendo...
                  </>
                ) : form.floorPlanUrl ? (
                  <>
                    <FileText className="size-4 text-neon-cyan" aria-hidden="true" />
                    Plano cargado -- clic para reemplazar
                  </>
                ) : (
                  <>
                    <UploadCloud className="size-4" aria-hidden="true" />
                    Subir plano (imagen o PDF)
                  </>
                )}
              </label>
              <input
                id="floorPlanFile"
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                disabled={uploadingFloorPlan}
                onChange={(e) => {
                  handleFloorPlanSelected(e.target.files)
                  e.target.value = ""
                }}
              />
              {form.floorPlanUrl && (
                <div className="mt-1 flex items-center gap-2">
                  <a
                    href={form.floorPlanUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-neon-cyan underline underline-offset-2"
                  >
                    Ver plano actual
                  </a>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, floorPlanUrl: "" }))}
                    className="text-xs text-text-tertiary hover:text-error"
                  >
                    Quitar
                  </button>
                </div>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor="videoFile">Video (opcional)</FieldLabel>
              <label
                htmlFor="videoFile"
                className="border-glass-border bg-surface-elevated hover:border-neon-cyan/50 mt-1 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-3 text-sm text-text-secondary transition-colors duration-200"
              >
                {uploadingVideo ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Subiendo...
                  </>
                ) : form.videoUrl ? (
                  <>
                    <Video className="size-4 text-neon-cyan" aria-hidden="true" />
                    Video cargado -- clic para reemplazar
                  </>
                ) : (
                  <>
                    <UploadCloud className="size-4" aria-hidden="true" />
                    Subir video (MP4/WEBM)
                  </>
                )}
              </label>
              <input
                id="videoFile"
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                className="hidden"
                disabled={uploadingVideo}
                onChange={(e) => {
                  handleVideoSelected(e.target.files)
                  e.target.value = ""
                }}
              />
              {form.videoUrl && (
                <div className="mt-1 flex items-center gap-2">
                  <a
                    href={form.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-neon-cyan underline underline-offset-2"
                  >
                    Ver video actual
                  </a>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, videoUrl: "" }))}
                    className="text-xs text-text-tertiary hover:text-error"
                  >
                    Quitar
                  </button>
                </div>
              )}
            </Field>
          </div>

          <Field>
            <FieldLabel>¿Para qué destino es ideal esta propiedad?</FieldLabel>
            <p className="text-xs text-text-tertiary">
              Determina en qué carrusel del cliente aparece (puede marcar más de uno).
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {DESTINATION_OPTIONS.map((opt) => {
                const selected = form.targetDestinations.includes(opt.value)
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleDestination(opt.value)}
                    className={cn(
                      "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors duration-200",
                      selected
                        ? "border-neon-cyan bg-neon-cyan/10 text-neon-cyan"
                        : "border-glass-border text-text-secondary hover:text-text-primary"
                    )}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </Field>

          <Field>
            <FieldLabel>Servicios y comodidades</FieldLabel>
            <p className="text-xs text-text-tertiary">
              Se muestran como íconos con tooltip en el carrusel de propiedades del cliente.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1 sm:grid-cols-3 md:grid-cols-4">
              {PROPERTY_AMENITIES.map((amenity) => {
                const Icon = AMENITY_ICONS[amenity.value]
                const selected = form.amenities.includes(amenity.value)
                return (
                  <button
                    key={amenity.value}
                    type="button"
                    onClick={() => toggleAmenity(amenity.value)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs font-medium transition-colors duration-200",
                      selected
                        ? "border-neon-cyan bg-neon-cyan/10 text-neon-cyan"
                        : "border-glass-border text-text-secondary hover:text-text-primary"
                    )}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                    {amenity.label}
                  </button>
                )
              })}
            </div>
          </Field>

          <Field>
            <FieldLabel>Perfilamiento Airbnb / venta a corto plazo</FieldLabel>
            <div className="flex flex-wrap gap-4 pt-1 text-sm text-text-secondary">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.nearHistoricCenter}
                  onChange={(e) => setForm((f) => ({ ...f, nearHistoricCenter: e.target.checked }))}
                />
                Cerca de casco histórico/céntrico
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.nearTouristZone}
                  onChange={(e) => setForm((f) => ({ ...f, nearTouristZone: e.target.checked }))}
                />
                Cerca de zona turística
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.nearBusinessDistrict}
                  onChange={(e) => setForm((f) => ({ ...f, nearBusinessDistrict: e.target.checked }))}
                />
                Cerca de negocios/sector financiero
              </label>
            </div>
          </Field>

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="glow-cyan bg-neon-cyan text-deep hover:bg-neon-cyan/90 w-fit"
            >
              {isSubmitting ? "Guardando..." : editingId ? "Guardar cambios" : "Crear propiedad"}
            </Button>
            {editingId && (
              <Button type="button" variant="outline" className="w-fit" onClick={resetForm}>
                Cancelar edición
              </Button>
            )}
          </div>
        </form>
      </div>

      <div className="glass-card overflow-x-auto rounded-2xl p-4">
        {loading ? (
          <p className="p-4 text-sm text-text-tertiary">Cargando...</p>
        ) : properties.length === 0 ? (
          <p className="p-4 text-sm text-text-tertiary">Todavía no hay propiedades cargadas.</p>
        ) : (
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-glass-border text-left text-xs uppercase tracking-wide text-text-tertiary">
                <th className="py-2 pr-2">Nombre</th>
                <th className="py-2 pr-2">Comuna</th>
                <th className="py-2 pr-2 text-right">Precio UF</th>
                <th className="py-2 pr-2">Propósito</th>
                <th className="py-2 pr-2">Disponible</th>
                <th className="py-2 pr-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {properties.map((property) => (
                <tr key={property.id} className={cn("border-b border-glass-border/50", !property.available && "opacity-50")}>
                  <td className="py-2 pr-2 text-text-secondary">{property.name}</td>
                  <td className="py-2 pr-2 text-text-secondary">{property.comuna}</td>
                  <td className="py-2 pr-2 text-right text-text-secondary">{property.price_uf}</td>
                  <td className="py-2 pr-2 text-text-secondary">{PURPOSE_LABELS[property.purpose ?? ""] ?? "—"}</td>
                  <td className="py-2 pr-2">
                    <button
                      type="button"
                      onClick={() => toggleAvailable(property)}
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-xs font-medium",
                        property.available
                          ? "border-success/40 bg-success/10 text-success"
                          : "border-text-tertiary/40 bg-text-tertiary/10 text-text-tertiary"
                      )}
                    >
                      {property.available ? "Sí" : "No"}
                    </button>
                  </td>
                  <td className="py-2 pr-2">
                    <div className="flex items-center justify-end gap-2">
                      <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => startEdit(property)}>
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs text-error"
                        onClick={() => remove(property)}
                      >
                        Eliminar
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
