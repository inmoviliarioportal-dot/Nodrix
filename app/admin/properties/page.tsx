"use client"

import * as React from "react"
import { toast } from "sonner"

import { Toaster } from "@/components/ui/sonner"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface PropertyRow {
  id: string
  name: string
  comuna: string
  location: string | null
  price_uf: number
  purpose: string | null
  available: boolean
  images: string[] | null
  floor_plan_url: string | null
  video_url: string | null
}

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
  comuna: "",
  location: "",
  priceUf: "",
  purpose: "ambos",
  imagesText: "",
  floorPlanUrl: "",
  videoUrl: "",
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
  const [loading, setLoading] = React.useState(true)
  const [form, setForm] = React.useState(EMPTY_FORM)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const load = React.useCallback(() => {
    setLoading(true)
    fetch("/api/admin/properties")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setProperties(data?.properties ?? []))
      .finally(() => setLoading(false))
  }, [])

  React.useEffect(() => {
    load()
  }, [load])

  function resetForm() {
    setForm(EMPTY_FORM)
    setEditingId(null)
  }

  function startEdit(property: PropertyRow) {
    setEditingId(property.id)
    setForm({
      name: property.name,
      comuna: property.comuna,
      location: property.location ?? "",
      priceUf: String(property.price_uf),
      purpose: property.purpose ?? "ambos",
      imagesText: (property.images ?? []).join("\n"),
      floorPlanUrl: property.floor_plan_url ?? "",
      videoUrl: property.video_url ?? "",
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

    const images = form.imagesText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)

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
          priceUf,
          purpose: form.purpose,
          images,
          floorPlanUrl: form.floorPlanUrl || null,
          videoUrl: form.videoUrl || null,
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
            <Field>
              <FieldLabel htmlFor="comuna">Comuna</FieldLabel>
              <Input
                id="comuna"
                className="bg-surface-elevated border-glass-border"
                value={form.comuna}
                onChange={(e) => setForm((f) => ({ ...f, comuna: e.target.value }))}
                placeholder="Ñuñoa"
              />
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

          <Field>
            <FieldLabel htmlFor="images">Imágenes referenciales (una URL por línea)</FieldLabel>
            <textarea
              id="images"
              rows={3}
              className="bg-surface-elevated border-glass-border w-full rounded-md border px-3 py-2 text-sm text-text-primary outline-none focus-visible:ring-3 focus-visible:ring-neon-cyan/30"
              value={form.imagesText}
              onChange={(e) => setForm((f) => ({ ...f, imagesText: e.target.value }))}
              placeholder="https://.../foto1.jpg"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="floorPlanUrl">URL de plano / distribución (opcional)</FieldLabel>
            <Input
              id="floorPlanUrl"
              className="bg-surface-elevated border-glass-border"
              value={form.floorPlanUrl}
              onChange={(e) => setForm((f) => ({ ...f, floorPlanUrl: e.target.value }))}
              placeholder="https://.../plano.jpg"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="videoUrl">URL del video (opcional)</FieldLabel>
            <Input
              id="videoUrl"
              className="bg-surface-elevated border-glass-border"
              value={form.videoUrl}
              onChange={(e) => setForm((f) => ({ ...f, videoUrl: e.target.value }))}
              placeholder="https://.../video.mp4"
            />
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
                          ? "border-status-success/40 bg-status-success/10 text-status-success"
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
                        className="h-7 px-2 text-xs text-status-error"
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
