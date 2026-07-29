/**
 * Montos exactos (CLP) para los desplegables de renta/ahorro/deuda del
 * Wizard — reemplaza el sistema de bandas/rangos aproximados
 * (`lib/financial-bands.ts`) para que el cliente elija el monto exacto en
 * vez de estimar un rango, mejorando la precisión de la pre-evaluación en
 * UF (`lib/uf-preevaluation.ts`).
 *
 * Incremento variable: más fino en los tramos bajos (donde hay más
 * clientes) y más espaciado en los tramos altos, para no generar una lista
 * de miles de opciones sin perder precisión donde importa.
 * - $0 a $2.000.000: cada $50.000
 * - $2.250.000 a $10.000.000: cada $250.000
 * - $11.000.000 a $30.000.000: cada $1.000.000
 */
export function generateAmountOptions(): number[] {
  const options: number[] = [];
  for (let v = 0; v <= 2_000_000; v += 50_000) options.push(v);
  for (let v = 2_250_000; v <= 10_000_000; v += 250_000) options.push(v);
  for (let v = 11_000_000; v <= 30_000_000; v += 1_000_000) options.push(v);
  return options;
}

export const AMOUNT_OPTIONS = generateAmountOptions();

/**
 * Igual que `generateAmountOptions` pero topado en $8.000.000 -- se usa
 * para montos de INGRESO (sueldo, boleta, pensión, alquiler, sociedad,
 * renta del aval) para no generar un listado demasiado largo. Ahorro/pie
 * disponible y saldo de deuda siguen usando `AMOUNT_OPTIONS` (hasta $30M),
 * ya que un pie disponible puede superar los $8M sin ser un ingreso mensual
 * irreal.
 */
export function generateIncomeAmountOptions(): number[] {
  const options: number[] = [];
  for (let v = 0; v <= 2_000_000; v += 50_000) options.push(v);
  for (let v = 2_250_000; v <= 8_000_000; v += 250_000) options.push(v);
  return options;
}

export const INCOME_AMOUNT_OPTIONS = generateIncomeAmountOptions();

/** Formatea un monto CLP para mostrar en el desplegable (ej. "$1.250.000"). */
export function formatAmountCLP(value: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}
