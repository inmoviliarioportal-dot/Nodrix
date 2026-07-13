/**
 * Motor de Scoring Determinístico — Plataforma Inmobiliaria Inteligente
 *
 * Reglas de negocio 100% deterministas (cero IA generativa decidiendo el score).
 * Cualquier input produce siempre el mismo output. Ver `rulesVersion` para
 * trazabilidad/auditoría histórica si las reglas cambian en el futuro.
 *
 * Espejo SQL: database/functions/scoring_fn.sql implementa la MISMA lógica
 * para poder ejecutar el cálculo directamente en Postgres (trigger/RPC).
 */

export const RULES_VERSION = "v1.0.0";

export interface CustomerFinancialProfile {
  monthlySalary: number; // CLP
  savingsAmount: number; // CLP
  employmentType: "indefinido" | "plazo_fijo" | "honorarios" | "independiente";
  employmentYears: number;
  hasExistingDebt: boolean;
  monthlyDebtPayments: number; // CLP
}

export type ScoringCategory = "BRONCE" | "PLATA" | "ORO" | "PLATINO";

export interface ScoringFactor {
  factor: string;
  points: number; // puntos obtenidos dentro del peso de este factor
  weight: number; // peso máximo posible de este factor (puntos sobre 100)
}

export interface ScoringResult {
  score: number; // 0-100
  category: ScoringCategory;
  explanation: string; // Explicación legible en español para el cliente
  factorsApplied: ScoringFactor[];
  rulesVersion: string;
}

/**
 * Umbrales de categoría. Configurables aquí (única fuente de verdad, se
 * espeja manualmente en scoring_fn.sql).
 */
export const SCORING_THRESHOLDS = {
  BRONCE: { min: 0, max: 39 },
  PLATA: { min: 40, max: 59 },
  ORO: { min: 60, max: 79 },
  PLATINO: { min: 80, max: 100 },
} as const;

/**
 * Pesos máximos por factor (deben sumar exactamente 100).
 *
 * Justificación de negocio:
 * - SALARIO (35): el ingreso mensual es el mejor predictor único de capacidad
 *   de pago sostenida en el tiempo para un crédito hipotecario/promesa; se le
 *   da el mayor peso porque bancos y financieras usan renta como filtro primario.
 * - AHORRO (25): el pie disponible reduce el monto a financiar y es una señal
 *   fuerte de disciplina financiera y "skin in the game"; segundo factor más
 *   determinante para aprobación real en Chile (mínimo pie exigido por bancos).
 * - ESTABILIDAD_LABORAL (20): contrato indefinido + antigüedad reduce riesgo
 *   de no pago por cesantía; pesa menos que salario/ahorro porque es más una
 *   señal de riesgo que de capacidad, pero sigue siendo relevante para plazos
 *   largos (15-30 años).
 * - CARGA_FINANCIERA (20): ratio dividendo/renta (deuda existente vs ingreso);
 *   castiga sobreendeudamiento. Mismo peso que estabilidad porque ambos son
 *   factores de "riesgo de no pago" más que de "capacidad de pago".
 */
export const FACTOR_WEIGHTS = {
  SALARIO: 35,
  AHORRO: 25,
  ESTABILIDAD_LABORAL: 20,
  CARGA_FINANCIERA: 20,
} as const;

// Sanity check en tiempo de carga del módulo: los pesos nunca deben exceder 100.
const TOTAL_WEIGHT = Object.values(FACTOR_WEIGHTS).reduce((a, b) => a + b, 0);
if (TOTAL_WEIGHT > 100) {
  throw new Error(
    `Configuración inválida de scoring: la suma de pesos (${TOTAL_WEIGHT}) excede 100`
  );
}

/**
 * SALARIO (peso 35): tramos de renta mensual (CLP) → fracción del peso máximo.
 * Tramos alineados a rangos típicos de renta líquida en Chile para vivienda.
 */
function scoreSalario(monthlySalary: number): number {
  const weight = FACTOR_WEIGHTS.SALARIO;
  if (!Number.isFinite(monthlySalary) || monthlySalary <= 0) return 0;

  if (monthlySalary < 500_000) return weight * 0.15;
  if (monthlySalary < 900_000) return weight * 0.4;
  if (monthlySalary < 1_500_000) return weight * 0.65;
  if (monthlySalary < 2_500_000) return weight * 0.85;
  return weight * 1.0;
}

/**
 * AHORRO (peso 25): capacidad de pie disponible, estimada como fracción de
 * una propiedad target de referencia (usamos 20% de pie estándar en Chile
 * como el umbral "ideal" — quien tiene ahorro >= 20% de una propiedad de
 * referencia de 60M CLP obtiene el máximo puntaje).
 */
const REFERENCE_PROPERTY_VALUE = 60_000_000; // CLP, valor de referencia MVP
const IDEAL_DOWN_PAYMENT_RATIO = 0.2; // 20% de pie es el "ideal" bancario

function scoreAhorro(savingsAmount: number): number {
  const weight = FACTOR_WEIGHTS.AHORRO;
  if (!Number.isFinite(savingsAmount) || savingsAmount <= 0) return 0;

  const idealSavings = REFERENCE_PROPERTY_VALUE * IDEAL_DOWN_PAYMENT_RATIO;
  const ratio = savingsAmount / idealSavings;

  if (ratio >= 1) return weight * 1.0;
  if (ratio >= 0.5) return weight * 0.7;
  if (ratio >= 0.25) return weight * 0.45;
  if (ratio >= 0.1) return weight * 0.2;
  return weight * 0.05;
}

/**
 * ESTABILIDAD LABORAL (peso 20): tipo de contrato (peso base 60% del factor)
 * + antigüedad (peso base 40% del factor).
 */
const EMPLOYMENT_TYPE_SCORE: Record<
  CustomerFinancialProfile["employmentType"],
  number
> = {
  indefinido: 1.0,
  plazo_fijo: 0.6,
  honorarios: 0.4,
  independiente: 0.3,
};

function scoreEstabilidadLaboral(
  employmentType: CustomerFinancialProfile["employmentType"],
  employmentYears: number
): number {
  const weight = FACTOR_WEIGHTS.ESTABILIDAD_LABORAL;
  const years = Number.isFinite(employmentYears) && employmentYears > 0 ? employmentYears : 0;

  const typeScore = EMPLOYMENT_TYPE_SCORE[employmentType] ?? 0;

  let yearsScore: number;
  if (years >= 5) yearsScore = 1.0;
  else if (years >= 2) yearsScore = 0.7;
  else if (years >= 1) yearsScore = 0.4;
  else yearsScore = 0.1;

  const combined = typeScore * 0.6 + yearsScore * 0.4;
  return weight * combined;
}

/**
 * CARGA FINANCIERA (peso 20): ratio dividendo/renta = deuda mensual existente
 * / salario mensual. Mientras más bajo el ratio, mejor el puntaje (menos
 * comprometido está el ingreso). Sin deuda existente = puntaje máximo.
 */
function scoreCargaFinanciera(
  hasExistingDebt: boolean,
  monthlyDebtPayments: number,
  monthlySalary: number
): number {
  const weight = FACTOR_WEIGHTS.CARGA_FINANCIERA;

  if (!hasExistingDebt || monthlyDebtPayments <= 0) return weight * 1.0;

  // Si no hay salario válido para calcular el ratio pero sí hay deuda, es el
  // peor escenario posible (riesgo máximo, no hay forma de pagar).
  if (!Number.isFinite(monthlySalary) || monthlySalary <= 0) return 0;

  const ratio = monthlyDebtPayments / monthlySalary;

  if (ratio <= 0.1) return weight * 0.9;
  if (ratio <= 0.25) return weight * 0.7;
  if (ratio <= 0.35) return weight * 0.45; // límite típico Dividendo/Renta bancario en Chile (~25-35%)
  if (ratio <= 0.5) return weight * 0.15;
  return 0; // sobreendeudado
}

function categoryFor(score: number): ScoringCategory {
  if (score >= SCORING_THRESHOLDS.PLATINO.min) return "PLATINO";
  if (score >= SCORING_THRESHOLDS.ORO.min) return "ORO";
  if (score >= SCORING_THRESHOLDS.PLATA.min) return "PLATA";
  return "BRONCE";
}

function buildExplanation(
  category: ScoringCategory,
  score: number,
  factors: ScoringFactor[]
): string {
  const lines = factors
    .map((f) => `- ${f.factor}: ${f.points.toFixed(1)} de ${f.weight} puntos posibles`)
    .join("\n");

  const categoryText: Record<ScoringCategory, string> = {
    BRONCE:
      "Tu perfil califica en categoría BRONCE. Hay oportunidades de mejora en salario, ahorro, estabilidad laboral o carga financiera para acceder a mejores condiciones.",
    PLATA:
      "Tu perfil califica en categoría PLATA. Tienes una base financiera aceptable, con espacio para mejorar en algunos factores.",
    ORO: "Tu perfil califica en categoría ORO. Tienes un perfil financiero sólido con buenas condiciones de acceso.",
    PLATINO:
      "Tu perfil califica en categoría PLATINO. Tienes el mejor perfil financiero posible, con acceso a las condiciones más favorables.",
  };

  return `${categoryText[category]} Puntaje total: ${score.toFixed(1)}/100.\nDetalle por factor:\n${lines}`;
}

/**
 * Calcula el scoring determinístico de un cliente en base a su perfil
 * financiero. Mismo input siempre produce el mismo output.
 */
export function calculateScoring(
  profile: CustomerFinancialProfile
): ScoringResult {
  const salarioPoints = scoreSalario(profile.monthlySalary);
  const ahorroPoints = scoreAhorro(profile.savingsAmount);
  const estabilidadPoints = scoreEstabilidadLaboral(
    profile.employmentType,
    profile.employmentYears
  );
  const cargaPoints = scoreCargaFinanciera(
    profile.hasExistingDebt,
    profile.monthlyDebtPayments,
    profile.monthlySalary
  );

  const factorsApplied: ScoringFactor[] = [
    { factor: "Salario", points: salarioPoints, weight: FACTOR_WEIGHTS.SALARIO },
    { factor: "Ahorro/Pie disponible", points: ahorroPoints, weight: FACTOR_WEIGHTS.AHORRO },
    {
      factor: "Estabilidad laboral",
      points: estabilidadPoints,
      weight: FACTOR_WEIGHTS.ESTABILIDAD_LABORAL,
    },
    {
      factor: "Carga financiera",
      points: cargaPoints,
      weight: FACTOR_WEIGHTS.CARGA_FINANCIERA,
    },
  ];

  const rawScore = factorsApplied.reduce((sum, f) => sum + f.points, 0);
  // Clamp defensivo: nunca debería salir de [0, 100] dado el diseño de los
  // sub-scores, pero protegemos contra errores de configuración futuros.
  const score = Math.min(100, Math.max(0, Math.round(rawScore * 10) / 10));

  const category = categoryFor(score);
  const explanation = buildExplanation(category, score, factorsApplied);

  return {
    score,
    category,
    explanation,
    factorsApplied,
    rulesVersion: RULES_VERSION,
  };
}
