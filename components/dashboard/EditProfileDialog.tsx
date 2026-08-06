"use client"

import * as React from "react"
import { toast } from "sonner"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  GENDER_OPTIONS,
  INVESTMENT_TYPE_OPTIONS,
  PROPERTY_STATUS_OPTIONS,
} from "@/components/auth/schemas"

interface CustomerProfile {
  first_name?: string | null
  last_name?: string | null
  phone?: string | null
  gender?: string | null
  birth_date?: string | null
  age?: number | null
  monthly_income?: number | null
  investment_type?: string | null
  property_status?: string | null
  /** Multi-selección (migración 039); ausente en perfiles anteriores. */
  property_statuses?: string[] | null
}

interface EditProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated?: () => void
}

const selectClassName =
  "bg-surface-elevated border-glass-border focus-visible:border-neon-cyan focus-visible:ring-neon-cyan/30 h-9 w-full rounded-md border px-3 text-sm text-text-primary outline-none focus-visible:ring-3"

/**
 * Modal para "Editar mis datos" — carga el perfil actual desde
 * GET /api/customers/me al abrirse y guarda cambios con
 * PATCH /api/customers/me. RUT y email quedan fuera del formulario
 * (ver nota en app/api/customers/me/route.ts).
 */
function EditProfileDialog({ open, onOpenChange, onUpdated }: EditProfileDialogProps) {
  const [loading, setLoading] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [form, setForm] = React.useState({
    firstName: "",
    lastName: "",
    phone: "",
    gender: "",
    birthDate: "",
    age: "",
    monthlyIncome: "",
    investmentType: "",
  })
  // Multi-selección (migración 039): el cliente puede aceptar más de un
  // estado de inmueble, así que vive fuera del `form` de campos de texto.
  const [propertyStatuses, setPropertyStatuses] = React.useState<string[]>([])

  React.useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch("/api/customers/me")
      .then((res) => res.json())
      .then((data) => {
        const customer: CustomerProfile = data?.customer ?? {}
        setForm({
          firstName: customer.first_name ?? "",
          lastName: customer.last_name ?? "",
          phone: customer.phone ?? "",
          gender: customer.gender ?? "",
          birthDate: customer.birth_date ?? "",
          age: customer.age != null ? String(customer.age) : "",
          monthlyIncome: customer.monthly_income != null ? String(customer.monthly_income) : "",
          investmentType: customer.investment_type ?? "",
        })
        // Perfiles anteriores a la migración 039 solo tienen el valor único:
        // se envuelve en un arreglo para no perder lo que ya había elegido.
        setPropertyStatuses(
          customer.property_statuses ?? (customer.property_status ? [customer.property_status] : [])
        )
      })
      .catch(() => toast.error("No se pudo cargar tu perfil."))
      .finally(() => setLoading(false))
  }, [open])

  function handleChange(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    try {
      const response = await fetch("/api/customers/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone,
          gender: form.gender,
          birthDate: form.birthDate,
          age: form.age ? Number(form.age) : undefined,
          monthlyIncome: form.monthlyIncome ? Number(form.monthlyIncome) : undefined,
          investmentType: form.investmentType,
          // El singular queda como snapshot del primero, igual que en el flujo
          // de perfilamiento, para no romper lecturas previas a la 039. Se
          // omite (undefined) si no hay ninguno: la API rechaza "" porque no
          // es un estado válido.
          propertyStatus: propertyStatuses[0],
          propertyStatuses,
        }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        toast.error(data?.error ?? "No se pudo actualizar tu perfil.")
        return
      }
      toast.success("Datos actualizados correctamente.")
      onUpdated?.()
      onOpenChange(false)
    } catch {
      toast.error("Error de conexión. Intenta nuevamente.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar mis datos</DialogTitle>
          <DialogDescription>Actualiza tu información de contacto y perfil de inversión.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="py-6 text-center text-sm text-text-tertiary">Cargando...</p>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="edit-firstName">Nombres</FieldLabel>
                <Input
                  id="edit-firstName"
                  className="bg-surface-elevated border-glass-border"
                  value={form.firstName}
                  onChange={(e) => handleChange("firstName", e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-lastName">Apellidos</FieldLabel>
                <Input
                  id="edit-lastName"
                  className="bg-surface-elevated border-glass-border"
                  value={form.lastName}
                  onChange={(e) => handleChange("lastName", e.target.value)}
                />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="edit-phone">Teléfono</FieldLabel>
              <Input
                id="edit-phone"
                type="tel"
                className="bg-surface-elevated border-glass-border"
                value={form.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="edit-gender">Sexo</FieldLabel>
                <select
                  id="edit-gender"
                  className={selectClassName}
                  value={form.gender}
                  onChange={(e) => handleChange("gender", e.target.value)}
                >
                  <option value="">Selecciona</option>
                  {GENDER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-birthDate">Fecha de nacimiento</FieldLabel>
                <Input
                  id="edit-birthDate"
                  type="date"
                  className="bg-surface-elevated border-glass-border"
                  value={form.birthDate}
                  onChange={(e) => handleChange("birthDate", e.target.value)}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="edit-age">Edad</FieldLabel>
                <Input
                  id="edit-age"
                  type="number"
                  min={18}
                  max={120}
                  className="bg-surface-elevated border-glass-border"
                  value={form.age}
                  onChange={(e) => handleChange("age", e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-monthlyIncome">Renta mensual (CLP)</FieldLabel>
                <Input
                  id="edit-monthlyIncome"
                  type="number"
                  min={0}
                  className="bg-surface-elevated border-glass-border"
                  value={form.monthlyIncome}
                  onChange={(e) => handleChange("monthlyIncome", e.target.value)}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="edit-investmentType">Tipo de inversión</FieldLabel>
                <select
                  id="edit-investmentType"
                  className={selectClassName}
                  value={form.investmentType}
                  onChange={(e) => handleChange("investmentType", e.target.value)}
                >
                  <option value="">Selecciona</option>
                  {INVESTMENT_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field>
                <FieldLabel>Estado del inmueble</FieldLabel>
                <p className="text-xs text-text-tertiary">
                  Puedes elegir más de uno.
                </p>
                <div className="flex flex-wrap gap-2">
                  {PROPERTY_STATUS_OPTIONS.map((option) => {
                    const selected = propertyStatuses.includes(option.value)
                    return (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={selected}
                        onClick={() =>
                          setPropertyStatuses((prev) =>
                            prev.includes(option.value)
                              ? prev.filter((value) => value !== option.value)
                              : [...prev, option.value]
                          )
                        }
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-200 ${
                          selected
                            ? "border-neon-cyan bg-neon-cyan/10 text-neon-cyan"
                            : "border-glass-border text-text-secondary hover:text-text-primary"
                        }`}
                      >
                        {option.label}
                      </button>
                    )
                  })}
                </div>
              </Field>
            </div>

            <DialogFooter>
              <Button
                type="submit"
                disabled={saving}
                className="glow-cyan bg-neon-cyan text-deep hover:bg-neon-cyan/90"
              >
                {saving ? "Guardando..." : "Guardar cambios"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

export { EditProfileDialog }
