/**
 * Requisitos documentales por situación laboral/fuente de ingreso -- fuente
 * única de verdad, consumida tanto por el cliente (Bóveda documental,
 * app/dashboard/documents/page.tsx) como por el servidor (avance automático
 * de etapa, lib/stage-machine.ts). Los códigos de `IncomeType` son los
 * mismos que declara el cliente en el Paso 1 del wizard (lib/income-types.ts).
 *
 * Dato de negocio (no derivable del código): la lista exacta de documentos
 * por situación la definió el negocio directamente -- no inventar ni quitar
 * documentos de esta lista sin instrucción explícita.
 */

import type { IncomeType } from "@/lib/income-types";

export interface DocumentTypeDef {
  /** Código único usado en `documents.type` -- estable, no renombrar sin migrar datos existentes. */
  value: string;
  label: string;
  /** Aclaración corta sobre CÓMO subir el documento cuando se piden varios periodos (ej. "últimas 6 liquidaciones" -> un solo PDF). */
  hint?: string;
}

export interface SituationDocumentGroup {
  situation: IncomeType;
  /** Debe coincidir con el label usado en el wizard (Paso 1) para que el cliente reconozca la situación. */
  title: string;
  description: string;
  documents: DocumentTypeDef[];
  /** Nota adicional mostrada bajo el grupo, cuando aplica (ej. caso mixto socio+empleado). */
  note?: string;
}

/** La cédula de identidad es el único documento compartido por todas las
 * situaciones -- mismo `value` en todos los grupos para que el cliente solo
 * tenga que subirla una vez, aunque tenga ingresos mixtos. */
const CEDULA_DOC: DocumentTypeDef = { value: "cedula", label: "Cédula de identidad (ambos lados)" };

export const SITUATION_DOCUMENT_GROUPS: SituationDocumentGroup[] = [
  {
    situation: "sueldo_fijo",
    title: "Empleado (dependiente)",
    description: "Documentos para acreditar tu renta como trabajador dependiente.",
    documents: [
      {
        value: "liquidaciones_sueldo",
        label: "Liquidaciones de sueldo",
        hint: "Sube un solo PDF con tus 6 últimas liquidaciones.",
      },
      {
        value: "cotizaciones_afp",
        label: "Cotizaciones de AFP (con RUT empleador)",
        hint: "Sube un solo PDF con tus 24 últimas cotizaciones.",
      },
      CEDULA_DOC,
    ],
    note: "Si parte de tus ingresos proviene de una empresa en la que eres socio, complementa además con los documentos de Retiros de empresa.",
  },
  {
    situation: "alquiler",
    title: "Arrendador",
    description: "Documentos para acreditar tus ingresos por arriendo de propiedades.",
    documents: [
      { value: "avaluo_fiscal", label: "Avalúo fiscal (con RUT)" },
      { value: "contrato_arriendo", label: "Contrato de arriendo legalizado" },
      {
        value: "pagos_arriendo",
        label: "Pagos de arriendo",
        hint: "Sube un solo PDF con tus 6 últimos comprobantes de pago.",
      },
      CEDULA_DOC,
    ],
  },
  {
    situation: "boleta",
    title: "Independiente (boleta de honorarios)",
    description: "Documentos para acreditar tus ingresos como trabajador independiente.",
    documents: [
      {
        value: "boletas_honorarios",
        label: "Boletas de honorarios",
        hint: "Sube un solo PDF con tus 6 últimas boletas.",
      },
      { value: "resumen_boletas_2026", label: "Resumen anual de boletas 2026" },
      { value: "resumen_boletas_2025", label: "Resumen anual de boletas 2025" },
      { value: "declaracion_impuestos_2025", label: "Declaración anual de impuestos 2025" },
      { value: "declaracion_impuestos_2026", label: "Declaración anual de impuestos 2026" },
      CEDULA_DOC,
    ],
  },
  {
    situation: "sociedad",
    title: "Socio o dueño de empresa",
    description: "Documentos personales y de la empresa para acreditar tus retiros.",
    documents: [
      { value: "declaracion_impuestos_socio_2025", label: "Declaración de impuestos del socio 2025" },
      { value: "declaracion_impuestos_socio_2026", label: "Declaración de impuestos del socio 2026" },
      { value: "declaracion_impuestos_empresa_2025", label: "Declaración de impuestos de la empresa 2025" },
      { value: "declaracion_impuestos_empresa_2026", label: "Declaración de impuestos de la empresa 2026" },
      { value: "carpeta_tributaria", label: "Carpeta tributaria para solicitar crédito" },
      { value: "balance_2024", label: "Balance 2024" },
      { value: "balance_2025", label: "Balance 2025" },
      CEDULA_DOC,
    ],
  },
  {
    situation: "pension",
    title: "Pensionado",
    description: "Documentos para acreditar tus ingresos por pensión.",
    documents: [
      {
        value: "colillas_pension",
        label: "Colillas de pago de pensión",
        hint: "Sube un solo PDF con tus 3 últimas colillas.",
      },
      { value: "certificado_pension", label: "Certificado de pensión" },
      CEDULA_DOC,
    ],
  },
];

/** Fallback para solicitudes creadas antes de que existiera este sistema
 * (sin `income_sources` guardado) -- mantiene el checklist genérico anterior
 * para no dejarlas sin requisitos. */
export const LEGACY_DOCUMENT_TYPES: DocumentTypeDef[] = [
  { value: "cedula", label: "Cédula de identidad" },
  { value: "liquidacion_sueldo", label: "Liquidación de sueldo" },
  { value: "certificado_afp", label: "Certificado AFP" },
  { value: "contrato_trabajo", label: "Contrato de trabajo" },
];

/** Códigos válidos de situación laboral -- usado para filtrar `income_sources`. */
const VALID_SITUATIONS = new Set(SITUATION_DOCUMENT_GROUPS.map((g) => g.situation));

/** Extrae las situaciones laborales únicas y válidas desde el `income_sources`
 * crudo de una application (jsonb, puede venir en cualquier forma). */
export function situationsFromIncomeSources(rawIncomeSources: unknown): IncomeType[] {
  if (!Array.isArray(rawIncomeSources)) return [];
  const situations = new Set<IncomeType>();
  for (const raw of rawIncomeSources) {
    const type = (raw as { type?: unknown } | null)?.type;
    if (typeof type === "string" && VALID_SITUATIONS.has(type as IncomeType)) {
      situations.add(type as IncomeType);
    }
  }
  return [...situations];
}

/** Grupos de documentos aplicables a una lista de situaciones (mismo orden
 * que SITUATION_DOCUMENT_GROUPS, no el orden en que el cliente las declaró). */
export function situationGroupsFor(situations: IncomeType[]): SituationDocumentGroup[] {
  return SITUATION_DOCUMENT_GROUPS.filter((g) => situations.includes(g.situation));
}

/** Lista deduplicada de `value` de documento requeridos para un set de
 * situaciones -- usada para calcular progreso y gating de avance de etapa. */
export function requiredDocumentValuesFor(situations: IncomeType[]): string[] {
  const values = new Set<string>();
  situationGroupsFor(situations).forEach((group) => group.documents.forEach((doc) => values.add(doc.value)));
  return [...values];
}
