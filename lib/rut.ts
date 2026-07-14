/**
 * Validación de RUT chileno con dígito verificador real (módulo 11).
 * Antes solo se validaba el formato (7-8 dígitos + guión + dígito/K);
 * esto agrega el cálculo real del dígito verificador.
 */

/** Limpia un RUT a solo dígitos + dígito verificador (sin puntos/guión/espacios). */
export function cleanRut(rut: string): string {
  return rut.replace(/[.\s-]/g, "").toUpperCase();
}

/** Calcula el dígito verificador (módulo 11) para el cuerpo numérico de un RUT. */
export function computeCheckDigit(body: string): string {
  let sum = 0;
  let multiplier = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const remainder = 11 - (sum % 11);
  if (remainder === 11) return "0";
  if (remainder === 10) return "K";
  return String(remainder);
}

/**
 * Valida formato + dígito verificador real de un RUT chileno.
 * Acepta con o sin puntos, con guión (ej. "12.345.678-9" o "12345678-9").
 */
export function isValidRut(rut: string): boolean {
  const clean = cleanRut(rut);
  if (!/^\d{7,8}[0-9K]$/.test(clean)) return false;

  const body = clean.slice(0, -1);
  const checkDigit = clean.slice(-1);
  return computeCheckDigit(body) === checkDigit;
}

/** Formatea un RUT limpio como "12345678-9" (sin puntos, con guión). */
export function formatRut(rut: string): string {
  const clean = cleanRut(rut);
  if (clean.length < 2) return clean;
  return `${clean.slice(0, -1)}-${clean.slice(-1)}`;
}
