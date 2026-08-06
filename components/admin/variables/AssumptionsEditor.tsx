"use client"

import { NumberField } from "@/components/admin/variables/NumberField"

export interface AssumptionsValue {
  annualInterestRate: number
}

export function AssumptionsEditor({
  value,
  onChange,
}: {
  value: AssumptionsValue
  onChange: (value: AssumptionsValue) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-sm font-semibold text-text-primary">Supuestos financieros</h3>
        <p className="text-xs text-text-tertiary">La tasa que se usa para calcular el dividendo de cada crédito.</p>
      </div>
      <div className="sm:max-w-xs">
        <NumberField
          label="Tasa de interés anual referencial"
          asPercent
          value={value.annualInterestRate}
          onChange={(v) => onChange({ ...value, annualInterestRate: v })}
          help={{
            what: "La tasa de interés que se usa para calcular cuánto dividendo mensual paga un crédito a un plazo dado -- afecta el monto máximo que se le puede ofrecer a cualquier cliente.",
            example: "Con 4,5% anual, un crédito de 2.000 UF a 25 años tiene un dividendo mensual distinto que con 5,5%.",
            impact: "Subirla baja el monto máximo aprobado a TODOS los clientes (el mismo dividendo alcanza para menos crédito). Bajarla lo sube. No representa la tasa real del banco, es una referencia interna para estimar.",
          }}
        />
      </div>
    </div>
  )
}
