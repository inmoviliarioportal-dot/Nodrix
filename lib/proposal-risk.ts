/**
 * Motor de bandas de propuesta inicial — Plataforma Inmobiliaria Inteligente
 *
 * Antes de subir documentos, el cliente ve una SIMULACIÓN (nunca una
 * aprobación) del % estimado de probabilidad de aprobación bancaria para 6
 * tramos de departamentos: 1, 1 a 2, 2 a 3, 3 a 4, 4 a 5, y 5 a 6. Reutiliza
 * el `scoring_score` (0-100) ya calculado por `lib/scoring.ts` -- ese score
 * YA incorpora renta, ahorro, estabilidad laboral y carga financiera/DTI
 * (ver `scoreCargaFinanciera`), que es exactamente el criterio que evalúan
 * los bancos para créditos hipotecarios. No se recalcula el DTI acá para
 * evitar duplicar lógica de negocio en dos lugares.
 *
 * 100% determinístico (mismo score siempre produce el mismo resultado),
 * igual que el resto del motor de scoring del proyecto.
 *
 * IMPORTANTE: esto es una simulación ilustrativa, no una aprobación --
 * queda sujeta a confirmación tras el envío de la documentación real al
 * banco (ver `initial_proposal_*` en `applications` y el flujo de
 * propuesta final del asesor tras la aprobación bancaria).
 */

export type ProposalBand = "1" | "1-2" | "2-3" | "3-4" | "4-5" | "5-6";
export type ProposalPurpose = "inversion" | "vivienda_propia";

export const PROPOSAL_BANDS: ProposalBand[] = ["1", "1-2", "2-3", "3-4", "4-5", "5-6"];

export const PROPOSAL_BAND_LABELS: Record<ProposalBand, string> = {
  "1": "1 departamento",
  "1-2": "1 a 2 departamentos",
  "2-3": "2 a 3 departamentos",
  "3-4": "3 a 4 departamentos",
  "4-5": "4 a 5 departamentos",
  "5-6": "5 a 6 departamentos",
};

/**
 * Factor de dificultad por banda (índice 0 = "1 depto", el más accesible;
 * índice 5 = "5 a 6 deptos", el más exigente). Multiplica el score para
 * obtener el % estimado -- mientras más departamentos se comprometen a la
 * vez, mayor el riesgo percibido por el banco, y menor la probabilidad para
 * el mismo perfil financiero.
 */
const BAND_DIFFICULTY: Record<ProposalBand, number> = {
  "1": 0.95,
  "1-2": 0.83,
  "2-3": 0.71,
  "3-4": 0.59,
  "4-5": 0.47,
  "5-6": 0.35,
};

const MIN_PROBABILITY = 3;
const MAX_PROBABILITY = 97;

function probabilityFor(score: number, band: ProposalBand): number {
  const raw = score * BAND_DIFFICULTY[band];
  return Math.min(MAX_PROBABILITY, Math.max(MIN_PROBABILITY, Math.round(raw)));
}

export interface ProposalBandResult {
  band: ProposalBand;
  label: string;
  approvalProbability: number; // 0-100
}

/**
 * Calcula el % estimado de aprobación bancaria para las 6 bandas dado un
 * `scoring_score`. El resultado es independiente del propósito
 * (inversión/vivienda) -- la UI decide cuál lente resaltar primero, pero el
 * cálculo de riesgo es el mismo (misma capacidad de pago, distinto destino
 * del inmueble).
 */
export function calculateProposalBands(score: number): ProposalBandResult[] {
  const clamped = Number.isFinite(score) ? Math.min(100, Math.max(0, score)) : 0;
  return PROPOSAL_BANDS.map((band) => ({
    band,
    label: PROPOSAL_BAND_LABELS[band],
    approvalProbability: probabilityFor(clamped, band),
  }));
}
