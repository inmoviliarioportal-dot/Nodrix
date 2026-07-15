/**
 * Motor de bandas de propuesta inicial — Plataforma Inmobiliaria Inteligente
 *
 * Antes de subir documentos, el cliente ve una SIMULACIÓN (nunca una
 * aprobación) de cuántos departamentos podría optar según su riesgo
 * crediticio: 1 depto, 2 a 4 deptos, o 5 a 6 deptos. Reutiliza el
 * `scoring_score` (0-100) ya calculado por `lib/scoring.ts` -- ese score YA
 * incorpora renta, ahorro, estabilidad laboral y carga financiera/DTI (ver
 * `scoreCargaFinanciera`), que es exactamente el criterio que evalúan los
 * bancos para créditos hipotecarios. No se recalcula el DTI acá para evitar
 * duplicar lógica de negocio en dos lugares.
 *
 * 100% determinístico (mismo score siempre produce el mismo resultado),
 * igual que el resto del motor de scoring del proyecto.
 *
 * IMPORTANTE: esto es una simulación ilustrativa, no una aprobación --
 * queda sujeta a confirmación tras el envío de la documentación real al
 * banco (ver `initial_proposal_*` en `applications` y el flujo de
 * propuesta final del asesor tras la aprobación bancaria).
 */

export type ProposalBand = "1" | "2-4" | "5-6";
export type SecurityLevel = "alta" | "media" | "baja";
export type ProposalPurpose = "inversion" | "vivienda_propia";

export const PROPOSAL_BANDS: ProposalBand[] = ["1", "2-4", "5-6"];

export const PROPOSAL_BAND_LABELS: Record<ProposalBand, string> = {
  "1": "1 departamento",
  "2-4": "2 a 4 departamentos",
  "5-6": "5 a 6 departamentos",
};

/**
 * Umbrales de score (0-100) por banda: a partir de qué puntaje el nivel de
 * seguridad sube a "alta" o "media". Bajo el umbral de "media" es "baja".
 * Cortes alineados a `SCORING_THRESHOLDS` de lib/scoring.ts (BRONCE 0-39,
 * PLATA 40-59, ORO 60-74, PLATINO 75-89, BLACK 90-100): mientras más
 * departamentos, más exigente el umbral -- refleja que comprometer más
 * unidades a la vez implica mayor riesgo para el banco.
 */
const BAND_THRESHOLDS: Record<ProposalBand, { alta: number; media: number }> = {
  "1": { alta: 40, media: 20 }, // desde PLATA ya es "alta" para una sola unidad
  "2-4": { alta: 60, media: 40 }, // desde ORO es "alta"; PLATA es "media"
  "5-6": { alta: 80, media: 55 }, // requiere PLATINO+ para "alta"; ORO alto es "media"
};

function levelFor(score: number, band: ProposalBand): SecurityLevel {
  const { alta, media } = BAND_THRESHOLDS[band];
  if (score >= alta) return "alta";
  if (score >= media) return "media";
  return "baja";
}

export interface ProposalBandResult {
  band: ProposalBand;
  label: string;
  level: SecurityLevel;
}

/**
 * Calcula el nivel de seguridad para las 3 bandas dado un `scoring_score`.
 * El resultado es independiente del propósito (inversión/vivienda) -- la
 * UI decide cuál lente resaltar primero, pero el cálculo de riesgo es el
 * mismo (misma capacidad de pago, distinto destino del inmueble).
 */
export function calculateProposalBands(score: number): ProposalBandResult[] {
  const clamped = Number.isFinite(score) ? Math.min(100, Math.max(0, score)) : 0;
  return PROPOSAL_BANDS.map((band) => ({
    band,
    label: PROPOSAL_BAND_LABELS[band],
    level: levelFor(clamped, band),
  }));
}
