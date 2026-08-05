"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface LoanTermTierRow {
  maxAge: number
  years: 30 | 25 | 15
}

export type TiersByLevel = {
  profesional: LoanTermTierRow[]
  tecnico: LoanTermTierRow[]
}

const LEVEL_LABELS: Record<keyof TiersByLevel, string> = {
  profesional: "Profesional",
  tecnico: "Técnico",
}

const YEARS_OPTIONS: (30 | 25 | 15)[] = [30, 25, 15]

/**
 * Valida en el cliente la estructura de tramos de un nivel: `maxAge`
 * estrictamente ascendente (sin huecos ni solapes -- mismo criterio que
 * `validateLoanTermTiersStructure` en el backend) y `years` uno de 30/25/15.
 * Retorna la lista de errores (vacía si es válido).
 */
export function validateTierRows(levelLabel: string, rows: LoanTermTierRow[]): string[] {
  const errors: string[] = []
  if (rows.length === 0) return errors // vacío es válido (usa fallback plano)

  let previousMaxAge = -Infinity
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (!YEARS_OPTIONS.includes(row.years)) {
      errors.push(`${levelLabel}, tramo ${i + 1}: el plazo debe ser 30, 25 o 15 años.`)
    }
    if (!Number.isFinite(row.maxAge) || row.maxAge <= 0) {
      errors.push(`${levelLabel}, tramo ${i + 1}: la edad máxima debe ser un número positivo.`)
    } else if (row.maxAge <= previousMaxAge) {
      errors.push(
        `${levelLabel}, tramo ${i + 1}: la edad máxima (${row.maxAge}) debe ser mayor a la del tramo anterior (${previousMaxAge === -Infinity ? "-" : previousMaxAge}) -- no puede haber huecos ni solapes.`
      )
    }
    previousMaxAge = row.maxAge
  }
  return errors
}

function TierTable({
  level,
  rows,
  onChange,
}: {
  level: keyof TiersByLevel
  rows: LoanTermTierRow[]
  onChange: (rows: LoanTermTierRow[]) => void
}) {
  function updateRow(index: number, patch: Partial<LoanTermTierRow>) {
    onChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }

  function removeRow(index: number) {
    onChange(rows.filter((_, i) => i !== index))
  }

  function addRow() {
    const lastAge = rows.length > 0 ? rows[rows.length - 1].maxAge : 30
    onChange([...rows, { maxAge: lastAge + 5, years: 25 }])
  }

  const errors = validateTierRows(LEVEL_LABELS[level], rows)

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-text-primary">{LEVEL_LABELS[level]}</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[440px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-glass-border text-left text-xs uppercase tracking-wide text-text-tertiary">
              <th className="py-2 pr-2">Edad máxima</th>
              <th className="px-2 py-2">Plazo (años)</th>
              <th className="px-2 py-2">Edad al último pago</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-3 text-xs text-text-tertiary">
                  Sin tramos -- se usará el plazo plano (fallbackYears) para todos los casos.
                </td>
              </tr>
            ) : (
              rows.map((row, i) => {
                const ageAtLastPayment = row.maxAge + row.years
                return (
                  <tr key={i} className="border-b border-glass-border/50">
                    <td className="py-2 pr-2">
                      <input
                        type="number"
                        value={row.maxAge}
                        onChange={(e) => updateRow(i, { maxAge: Number(e.target.value) })}
                        className="w-24 rounded-md border border-glass-border bg-surface-elevated px-2 py-1 text-text-primary"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <select
                        value={row.years}
                        onChange={(e) => updateRow(i, { years: Number(e.target.value) as 30 | 25 | 15 })}
                        className="w-24 rounded-md border border-glass-border bg-surface-elevated px-2 py-1 text-text-primary"
                      >
                        {YEARS_OPTIONS.map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td
                      className={cn(
                        "px-2 py-2 font-medium",
                        ageAtLastPayment > 80 ? "text-status-error" : "text-text-secondary"
                      )}
                    >
                      {ageAtLastPayment}
                      {ageAtLastPayment > 80 ? " (excede 80)" : ""}
                    </td>
                    <td className="px-2 py-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => removeRow(i)}>
                        Quitar
                      </Button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      <Button type="button" size="sm" variant="outline" className="w-fit" onClick={addRow}>
        + Agregar tramo
      </Button>
      {errors.length > 0 && (
        <ul className="list-disc pl-5 text-xs text-status-error">
          {errors.map((err, i) => (
            <li key={i}>{err}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function LoanTermTiersEditor({
  tiers,
  onChange,
}: {
  tiers: TiersByLevel
  onChange: (tiers: TiersByLevel) => void
}) {
  return (
    <div className="flex flex-col gap-6">
      <TierTable level="profesional" rows={tiers.profesional} onChange={(rows) => onChange({ ...tiers, profesional: rows })} />
      <TierTable level="tecnico" rows={tiers.tecnico} onChange={(rows) => onChange({ ...tiers, tecnico: rows })} />
    </div>
  )
}
