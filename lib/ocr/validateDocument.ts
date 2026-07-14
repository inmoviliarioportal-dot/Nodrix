/**
 * Validación automática (pre-screening, no reemplaza al asesor) del texto
 * OCR extraído de un documento subido, según el tipo declarado:
 *
 * - cedula: debe contener un RUT con formato válido, y ese RUT debe
 *   coincidir con el RUT del cliente dueño de la solicitud (evita que suba
 *   la cédula de otra persona).
 * - liquidacion_sueldo: debe contener vocabulario típico de una liquidación
 *   de sueldo (haberes/descuentos/líquido/imponible) Y el nombre del
 *   cliente debe aparecer en el texto.
 * - certificado_afp: debe mencionar AFP y mostrar evidencia de ~12 periodos
 *   (mes/año) de cotizaciones.
 * - contrato_trabajo: debe contener vocabulario de contrato de trabajo Y la
 *   palabra "indefinido" (rechaza contratos a plazo fijo/honorarios).
 *
 * Cualquier tipo, además, intenta verificar que el nombre del cliente
 * aparezca en el documento (con tolerancia: basta que un nombre o apellido
 * de al menos 3 letras matchee).
 */

export interface DocumentOwner {
  name: string;
  rut?: string | null;
}

export interface DocumentValidationResult {
  valid: boolean;
  reasons: string[];
  checks: Record<string, boolean>;
}

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeRut(rut: string): string {
  return rut.replace(/[.\-\s]/g, "").toUpperCase();
}

const RUT_PATTERN = /\b(\d{1,2}\.?\d{3}\.?\d{3})-?([\dkK])\b/g;

function extractRuts(normalizedText: string): string[] {
  const matches = [...normalizedText.matchAll(RUT_PATTERN)];
  return matches.map((m) => normalizeRut(`${m[1]}-${m[2]}`));
}

/** ¿Aparece el nombre (o al menos un nombre/apellido) del cliente en el texto? */
function ownerNameAppears(normalizedText: string, ownerName: string): boolean {
  const tokens = normalize(ownerName)
    .split(" ")
    .filter((token) => token.length >= 3);
  if (tokens.length === 0) return true; // sin nombre que validar, no bloquear
  return tokens.some((token) => normalizedText.includes(token));
}

const MONTH_PATTERN =
  /\b(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|SETIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)\b/g;
const MONTH_YEAR_NUMERIC_PATTERN = /\b(0[1-9]|1[0-2])[\/\-](\d{4}|\d{2})\b/g;

function countDistinctPeriods(normalizedText: string): number {
  const monthNames = normalizedText.match(MONTH_PATTERN) ?? [];
  const monthNumeric = normalizedText.match(MONTH_YEAR_NUMERIC_PATTERN) ?? [];
  // Cuenta ocurrencias (no deduplicadas de forma estricta) como proxy de
  // "cuántos periodos distintos aparecen" — el OCR es ruidoso, así que se
  // prioriza tolerancia sobre precisión exacta.
  return new Set([...monthNames, ...monthNumeric]).size;
}

export function validateDocument(
  type: string,
  rawText: string,
  owner: DocumentOwner
): DocumentValidationResult {
  const text = normalize(rawText);
  const reasons: string[] = [];
  const checks: Record<string, boolean> = {};

  if (!text) {
    return {
      valid: false,
      reasons: ["No se pudo extraer texto del documento (posible imagen de baja calidad o PDF escaneado)."],
      checks: { textExtracted: false },
    };
  }
  checks.textExtracted = true;

  const nameMatches = ownerNameAppears(text, owner.name);
  checks.ownerNameMatches = nameMatches;
  if (!nameMatches) {
    reasons.push(`No encontramos el nombre "${owner.name}" en el documento.`);
  }

  switch (type) {
    case "cedula": {
      const ruts = extractRuts(text);
      checks.containsRut = ruts.length > 0;
      if (ruts.length === 0) {
        reasons.push("No se detectó un RUT en el documento.");
        break;
      }
      if (owner.rut) {
        const ownerRut = normalizeRut(owner.rut);
        const matches = ruts.includes(ownerRut);
        checks.rutMatchesOwner = matches;
        if (!matches) {
          reasons.push("El RUT del documento no coincide con el RUT registrado en tu cuenta.");
        }
      }
      break;
    }

    case "liquidacion_sueldo": {
      const keywords = ["LIQUIDACION", "SUELDO", "LIQUIDO", "IMPONIBLE", "HABERES", "DESCUENTOS"];
      const hits = keywords.filter((keyword) => text.includes(keyword));
      checks.looksLikePayslip = hits.length >= 2;
      if (hits.length < 2) {
        reasons.push("El documento no parece ser una liquidación de sueldo (faltan campos típicos).");
      }
      break;
    }

    case "certificado_afp": {
      checks.mentionsAfp = text.includes("AFP");
      if (!text.includes("AFP")) {
        reasons.push('El documento no menciona "AFP".');
      }
      const periods = countDistinctPeriods(text);
      checks.hasTwelveMonths = periods >= 10; // tolerancia por ruido de OCR
      if (periods < 10) {
        reasons.push(
          `Se detectaron ${periods} periodo(s) de cotización, se esperan las últimas 12 (mínimo 10 por tolerancia de OCR).`
        );
      }
      break;
    }

    case "contrato_trabajo": {
      const hasContractWords = text.includes("CONTRATO") && text.includes("TRABAJO");
      checks.looksLikeContract = hasContractWords;
      if (!hasContractWords) {
        reasons.push("El documento no parece ser un contrato de trabajo.");
      }
      const isIndefinido = text.includes("INDEFINIDO");
      const isPlazoFijo = text.includes("PLAZO FIJO") && !isIndefinido;
      checks.isIndefinido = isIndefinido;
      if (isPlazoFijo) {
        reasons.push("El contrato parece ser a plazo fijo, se requiere un contrato indefinido.");
      } else if (!isIndefinido) {
        reasons.push('No se encontró la palabra "indefinido" en el contrato.');
      }
      break;
    }

    default:
      // Tipo de documento sin reglas específicas todavía — solo se valida
      // que el texto se haya podido extraer y (si aplica) el nombre.
      break;
  }

  const valid = Object.values(checks).every(Boolean);
  return { valid, reasons, checks };
}
