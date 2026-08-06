"use client"

import { HelpTooltip } from "@/components/admin/variables/HelpTooltip"
import { NumberField } from "@/components/admin/variables/NumberField"

export interface PensionAgeTierValue {
  maxAge: number | null
  multiplier: number
}
export interface ProbabilitiesValue {
  bandDifficulty: Record<string, number>
  professionalLevelProbabilityCap: Record<string, number>
  pensionAgeTiers: PensionAgeTierValue[]
}

const BAND_LABELS: Record<string, string> = {
  "1": "1 depto",
  "1-2": "1 a 2 deptos",
  "2-3": "2 a 3 deptos",
  "3-4": "3 a 4 deptos",
  "4-5": "4 a 5 deptos",
  "5-6": "5 a 6 deptos",
}

const BAND_ORDER = ["1", "1-2", "2-3", "3-4", "4-5", "5-6"]

export function ProbabilitiesEditor({
  value,
  onChange,
}: {
  value: ProbabilitiesValue
  onChange: (value: ProbabilitiesValue) => void
}) {
  function updatePensionTier(i: number, patch: Partial<PensionAgeTierValue>) {
    onChange({
      ...value,
      pensionAgeTiers: value.pensionAgeTiers.map((t, idx) => (idx === i ? { ...t, ...patch } : t)),
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-sm font-semibold text-text-primary">Probabilidades</h3>
        <p className="text-xs text-text-tertiary">
          Indicadores internos para el equipo -- no cambian el monto que ve el cliente.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
            Dificultad por cantidad de departamentos
          </h4>
          <HelpTooltip
            what="Qué tan probable es que el banco apruebe según cuántos departamentos tiene la propuesta -- más departamentos, más difícil."
            example="Una propuesta de 1 depto tiene 95% de dificultad relativa a favor; una de 5 a 6 deptos, solo 35%."
            impact="Subir el porcentaje de un tramo hace que ese tipo de propuesta se vea con mejor probabilidad de aprobación en el panel del asesor -- no cambia el monto ofrecido al cliente."
          />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {BAND_ORDER.map((band) => (
            <NumberField
              key={band}
              label={BAND_LABELS[band] ?? band}
              asPercent
              value={value.bandDifficulty[band] ?? 0}
              onChange={(v) => onChange({ ...value, bandDifficulty: { ...value.bandDifficulty, [band]: v } })}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
            Tope por nivel profesional
          </h4>
          <HelpTooltip
            what="El techo máximo de probabilidad de aprobación que se le muestra al equipo, según si el cliente declaró ser profesional o técnico."
            example="Un profesional nunca ve más de 90% de probabilidad; un técnico, nunca más de 80%, aunque sus números financieros sean perfectos."
            impact="Subirlo permite que ese nivel llegue a probabilidades más altas en el panel del asesor. Es solo un indicador de gestión, no afecta el monto aprobado."
          />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:max-w-xs">
          <NumberField
            label="Profesional"
            value={value.professionalLevelProbabilityCap.profesional ?? 0}
            onChange={(v) =>
              onChange({
                ...value,
                professionalLevelProbabilityCap: { ...value.professionalLevelProbabilityCap, profesional: v },
              })
            }
            suffix="%"
          />
          <NumberField
            label="Técnico"
            value={value.professionalLevelProbabilityCap.tecnico ?? 0}
            onChange={(v) =>
              onChange({
                ...value,
                professionalLevelProbabilityCap: { ...value.professionalLevelProbabilityCap, tecnico: v },
              })
            }
            suffix="%"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
            Descuento de renta por edad (pensionados)
          </h4>
          <HelpTooltip
            what="Cuando el ingreso declarado es una pensión, se le aplica un descuento sobre el monto según la edad del titular, porque a mayor edad se considera un ingreso menos estable a futuro."
            example="Menos de 50 años: se cuenta el 80% de la pensión. Menos de 65: el 60%. 65 o más: el 40%."
            impact="Subir el porcentaje de un tramo hace que se cuente más renta de pensión para ese rango de edad, subiendo el monto aprobado a esos clientes."
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[340px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-glass-border text-left text-[11px] uppercase tracking-wide text-text-tertiary">
                <th className="py-2 pr-2">Edad hasta</th>
                <th className="px-2 py-2">Se cuenta</th>
              </tr>
            </thead>
            <tbody>
              {value.pensionAgeTiers.map((tier, i) => (
                <tr key={i} className="border-b border-glass-border/50">
                  <td className="py-2 pr-2">
                    <input
                      type="number"
                      disabled={tier.maxAge === null}
                      value={tier.maxAge === null ? "" : tier.maxAge}
                      placeholder={tier.maxAge === null ? "65 o más" : ""}
                      onChange={(e) =>
                        updatePensionTier(i, { maxAge: e.target.value === "" ? null : Number(e.target.value) })
                      }
                      className="w-24 rounded-md border border-glass-border bg-surface-elevated px-2 py-1 text-text-primary disabled:opacity-50"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <NumberField
                      label=""
                      className="w-24"
                      asPercent
                      value={tier.multiplier}
                      onChange={(v) => updatePensionTier(i, { multiplier: v })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
