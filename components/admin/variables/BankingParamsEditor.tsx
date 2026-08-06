"use client"

import { HelpTooltip } from "@/components/admin/variables/HelpTooltip"
import { NumberField } from "@/components/admin/variables/NumberField"

export interface IncomeTierValue {
  maxIncome: number | null
  maxRatio: number
}
export interface LeverageTierValue {
  maxIncome: number | null
  maxMultiple: number
}
export interface BankingParamsValue {
  minRentaDividendoRatio: number
  cargaFinancieraTiers: IncomeTierValue[]
  leverageTiers: LeverageTierValue[]
  shortTermDebtAmortizationMonths: number
}

function IncomeCell({
  value,
  onChange,
}: {
  value: number | null
  onChange: (value: number | null) => void
}) {
  const isUnlimited = value === null
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        disabled={isUnlimited}
        value={isUnlimited ? "" : value}
        placeholder={isUnlimited ? "sin techo" : ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        className="w-32 rounded-md border border-glass-border bg-surface-elevated px-2 py-1 text-sm text-text-primary disabled:opacity-50"
      />
      <label className="flex items-center gap-1 text-[11px] text-text-tertiary">
        <input type="checkbox" checked={isUnlimited} onChange={(e) => onChange(e.target.checked ? null : 0)} />
        sin techo
      </label>
    </div>
  )
}

export function BankingParamsEditor({
  value,
  onChange,
}: {
  value: BankingParamsValue
  onChange: (value: BankingParamsValue) => void
}) {
  function updateCargaTier(i: number, patch: Partial<IncomeTierValue>) {
    onChange({
      ...value,
      cargaFinancieraTiers: value.cargaFinancieraTiers.map((t, idx) => (idx === i ? { ...t, ...patch } : t)),
    })
  }
  function updateLeverageTier(i: number, patch: Partial<LeverageTierValue>) {
    onChange({
      ...value,
      leverageTiers: value.leverageTiers.map((t, idx) => (idx === i ? { ...t, ...patch } : t)),
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-sm font-semibold text-text-primary">Parámetros bancarios</h3>
        <p className="text-xs text-text-tertiary">Los 3 topes que determinan cuánto dividendo puede pagar un cliente.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <NumberField
          label="Relación renta / dividendo mínima"
          suffix="veces"
          value={value.minRentaDividendoRatio}
          onChange={(v) => onChange({ ...value, minRentaDividendoRatio: v })}
          help={{
            what: "Cuántas veces debe caber el dividendo nuevo dentro de la renta del cliente. Un valor de 3 significa que el dividendo no puede superar 1/3 de lo que gana.",
            example: "Con 3x, alguien que gana $1.500.000 puede tener a lo más $500.000 de dividendo nuevo.",
            impact: "Subirlo (ej. a 4x) exige que la renta sea aún más holgada, reduciendo el monto aprobado a todos. Nunca puede bajar de 2,5x -- el sistema lo rechaza.",
          }}
        />
        <NumberField
          label="Meses de amortización de deuda corto plazo"
          suffix="meses"
          value={value.shortTermDebtAmortizationMonths}
          onChange={(v) => onChange({ ...value, shortTermDebtAmortizationMonths: v })}
          help={{
            what: "En cuántas cuotas se asume que el cliente paga su deuda actual, para estimar cuánto le queda comprometido cada mes.",
            example: "Con 12 meses, una deuda de $2.400.000 se estima en $200.000 de cuota mensual.",
            impact: "Subirlo (ej. a 24 meses) reduce la cuota estimada de la deuda existente, dejando más espacio para el nuevo dividendo -- sube el monto aprobado.",
          }}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">Carga financiera por renta</h4>
          <HelpTooltip
            what="El porcentaje máximo de la renta que puede ir a cuotas totales (deuda actual + dividendo nuevo), y ese máximo sube mientras más gana el cliente."
            example="Hasta $2.000.000 el tope es 40%; entre $2.000.000 y $4.000.000 sube a 50%; sobre $4.000.000, 55%."
            impact="Subir un porcentaje aprueba más monto a los clientes de ese tramo de renta. Ningún tramo puede pasar de 60% -- el sistema lo rechaza."
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[380px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-glass-border text-left text-[11px] uppercase tracking-wide text-text-tertiary">
                <th className="py-2 pr-2">Renta hasta (CLP)</th>
                <th className="px-2 py-2">Tope de carga</th>
              </tr>
            </thead>
            <tbody>
              {value.cargaFinancieraTiers.map((tier, i) => (
                <tr key={i} className="border-b border-glass-border/50">
                  <td className="py-2 pr-2">
                    <IncomeCell value={tier.maxIncome} onChange={(v) => updateCargaTier(i, { maxIncome: v })} />
                  </td>
                  <td className="px-2 py-2">
                    <NumberField
                      label=""
                      className="w-28"
                      asPercent
                      value={tier.maxRatio}
                      onChange={(v) => updateCargaTier(i, { maxRatio: v })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">Leverage por renta</h4>
          <HelpTooltip
            what="Cuántas veces la renta mensual puede pesar la deuda de corto plazo total del cliente, y ese múltiplo también sube con la renta."
            example="Hasta $2.000.000, la deuda no puede superar 8 veces la renta; sobre $2.000.000, hasta 12 veces."
            impact="Subir el múltiplo permite aprobar a clientes con más deuda existente. Bajarlo es más estricto y descalifica a más gente con deudas altas."
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[380px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-glass-border text-left text-[11px] uppercase tracking-wide text-text-tertiary">
                <th className="py-2 pr-2">Renta hasta (CLP)</th>
                <th className="px-2 py-2">Múltiplo</th>
              </tr>
            </thead>
            <tbody>
              {value.leverageTiers.map((tier, i) => (
                <tr key={i} className="border-b border-glass-border/50">
                  <td className="py-2 pr-2">
                    <IncomeCell value={tier.maxIncome} onChange={(v) => updateLeverageTier(i, { maxIncome: v })} />
                  </td>
                  <td className="px-2 py-2">
                    <NumberField
                      label=""
                      className="w-24"
                      suffix="x"
                      value={tier.maxMultiple}
                      onChange={(v) => updateLeverageTier(i, { maxMultiple: v })}
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
