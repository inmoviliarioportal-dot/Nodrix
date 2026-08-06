"use client"

import { NumberField } from "@/components/admin/variables/NumberField"

export interface QualificationValue {
  minQualifyingUF: number
  minQualifyingTotalIncomeCLP: number
}

export function QualificationEditor({
  value,
  onChange,
}: {
  value: QualificationValue
  onChange: (value: QualificationValue) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-sm font-semibold text-text-primary">Calificación</h3>
        <p className="text-xs text-text-tertiary">Mínimos para que un cliente vea una propuesta.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <NumberField
          label="UF mínimas para calificar"
          suffix="UF"
          value={value.minQualifyingUF}
          onChange={(v) => onChange({ ...value, minQualifyingUF: v })}
          help={{
            what: "El monto mínimo que un cliente debe poder financiar para que le mostremos propiedades. Por debajo de esto, ve un mensaje de que hoy no califica en vez de una propuesta.",
            example: "Con 1.700 UF, alguien a quien le calculamos 1.500 UF no ve propiedades; alguien con 1.800 UF sí.",
            impact: "Subirlo deja fuera a más clientes con capacidad de compra baja. Bajarlo les muestra propiedades, pero puede ser una oferta poco realista para su presupuesto.",
          }}
        />
        <NumberField
          label="Ingreso mensual mínimo"
          suffix="CLP"
          value={value.minQualifyingTotalIncomeCLP}
          onChange={(v) => onChange({ ...value, minQualifyingTotalIncomeCLP: v })}
          help={{
            what: "La renta mensual total mínima (sueldo, más aval si aplica) para siquiera evaluar un crédito. Por debajo de esto, no se calcula nada más.",
            example: "Con $1.300.000, alguien que gana $1.100.000 queda fuera desde el primer filtro, sin importar sus otros datos.",
            impact: "Subirlo excluye a más clientes desde el inicio del proceso. Bajarlo evalúa a clientes con menos capacidad de pago real.",
          }}
        />
      </div>
    </div>
  )
}
