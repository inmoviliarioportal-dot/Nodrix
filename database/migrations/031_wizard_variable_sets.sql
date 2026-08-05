-- =============================================================================
-- Wizard Variable Sets — Parámetros financieros del motor de pre-evaluación
-- configurables por Admin
-- =============================================================================
-- Objetivo: permitir que un administrador modifique más adelante (módulo
-- admin de parámetros financieros) el plazo del crédito, umbrales de
-- calificación, parámetros bancarios (RRD/Carga Financiera/Leverage) y
-- porcentajes de probabilidad del motor de pre-evaluación
-- (lib/uf-preevaluation.ts, lib/income-types.ts, lib/proposal-risk.ts), SIN
-- tocar código ni desplegar.
--
-- Diseño: exactamente el mismo patrón de versionado por fila que
-- database/migrations/003_scoring_rule_sets.sql -- nunca se hace UPDATE de
-- una fila activa; se inserta una nueva versión y se marca 'active', dejando
-- la anterior en 'archived', para mantener trazabilidad de qué parámetros se
-- aplicaron a una solicitud histórica.
--
-- A diferencia de scoring_rule_sets (is_active BOOLEAN), acá se usa un
-- status TEXT ('draft' | 'active' | 'archived') porque el flujo de negocio
-- de este módulo admite simular una versión en borrador (`simulated_at`)
-- antes de publicarla como activa -- ver `note` y `simulated_at` más abajo.
--
-- Anclaje por solicitud: applications.wizard_variable_set_id (agregado en
-- 032_application_variable_pin.sql) referencia la fila de esta tabla que
-- estaba activa cuando se calculó la pre-evaluación de esa solicitud por
-- primera vez, para que publicar una nueva versión NUNCA altere el
-- resultado que ya vio un cliente existente. Solo se re-ancla cuando el
-- cliente edita sus datos financieros (endpoint update-financial-profile).
--
-- Esta tabla se aplica en Capa 0 (multi-tenant ready: org_id desde el día
-- 1), pero el ENDPOINT y la UI para editarla se construyen en un release
-- posterior (Admin). Mientras tanto, el motor de pre-evaluación sigue
-- usando los defaults hardcodeados en lib/uf-preevaluation.ts,
-- lib/income-types.ts y lib/proposal-risk.ts si no encuentra una fila activa
-- (fallback seguro, mismo patrón que loadActiveScoringConfig).
-- =============================================================================

CREATE TABLE IF NOT EXISTS wizard_variable_sets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id),
  version     INTEGER NOT NULL,

  -- Parámetros de plazo del crédito hipotecario. Shape esperado:
  -- {
  --   "maxAgeAtApplication": 65,
  --   "fallbackYears": 25,
  --   "tiers": {}
  -- }
  -- `fallbackYears` replica LOAN_TERM_YEARS (lib/uf-preevaluation.ts) -- el
  -- plazo referencial usado hoy para TODOS los clientes, sin diferenciar por
  -- edad/nivel profesional. `maxAgeAtApplication` (65) es un límite de
  -- negocio conocido (edad máxima para postular a un crédito hipotecario a
  -- 25-30 años) que aún no está implementado en código -- se deja
  -- documentado acá como referencia para cuando se agregue.
  -- `tiers` queda como placeholder vacío `{}`: la matriz real de
  -- edad x nivel profesional que determina el plazo 30/25/15 según el
  -- perfil del cliente la define un agente C1 posterior que aún no corrió.
  -- NO inventar esa matriz en esta migración -- hasta que `tiers` tenga
  -- contenido real, el motor debe seguir usando `fallbackYears` para todos
  -- los casos.
  loan_terms      JSONB NOT NULL,

  -- Umbrales de calificación mínima para poder optar a una evaluación de
  -- compra. Shape esperado:
  -- {
  --   "minQualifyingUF": 1700,
  --   "minQualifyingTotalIncomeCLP": 1300000
  -- }
  -- `minQualifyingUF` replica MIN_QUALIFYING_UF (lib/uf-preevaluation.ts).
  -- `minQualifyingTotalIncomeCLP` replica MIN_QUALIFYING_TOTAL_INCOME_CLP
  -- (lib/income-types.ts).
  qualification   JSONB NOT NULL,

  -- Parámetros bancarios de los 3 gates de evaluación de flujo financiero
  -- futuro (RRD / Carga Financiera / Leverage). Shape esperado:
  -- {
  --   "minRentaDividendoRatio": 3,
  --   "cargaFinancieraTiers": [
  --     {"maxIncome": 2000000, "maxRatio": 0.4},
  --     {"maxIncome": 4000000, "maxRatio": 0.5},
  --     {"maxIncome": null, "maxRatio": 0.55}
  --   ],
  --   "leverageTiers": [
  --     {"maxIncome": 2000000, "maxMultiple": 8},
  --     {"maxIncome": null, "maxMultiple": 12}
  --   ],
  --   "shortTermDebtAmortizationMonths": 12
  -- }
  -- Replica MIN_RENTA_DIVIDENDO_RATIO, CARGA_FINANCIERA_TIERS,
  -- LEVERAGE_TIERS y SHORT_TERM_DEBT_AMORTIZATION_MONTHS de
  -- lib/uf-preevaluation.ts. `maxIncome: null` representa Infinity (el
  -- tramo abierto/último de cada tabla de tramos -- JSON no soporta
  -- Infinity, la lógica de aplicación debe tratar `null` como "sin techo").
  banking_params  JSONB NOT NULL,

  -- Porcentajes de probabilidad de aprobación bancaria por banda de
  -- propuesta inicial y tope por nivel profesional, más los tramos de edad
  -- para el haircut de pensión. Shape esperado:
  -- {
  --   "bandDifficulty": {
  --     "1": 0.95, "1-2": 0.83, "2-3": 0.71,
  --     "3-4": 0.59, "4-5": 0.47, "5-6": 0.35
  --   },
  --   "professionalLevelProbabilityCap": {
  --     "profesional": 90, "tecnico": 80
  --   },
  --   "pensionAgeTiers": [
  --     {"maxAge": 50, "multiplier": 0.8},
  --     {"maxAge": 65, "multiplier": 0.6},
  --     {"maxAge": null, "multiplier": 0.4}
  --   ]
  -- }
  -- `bandDifficulty` y `professionalLevelProbabilityCap` replican
  -- BAND_DIFFICULTY y PROFESSIONAL_LEVEL_PROBABILITY_CAP de
  -- lib/proposal-risk.ts. `pensionAgeTiers` replica los tramos de edad para
  -- el haircut de pensión en el switch de `haircutFor` (lib/income-types.ts,
  -- caso "pension": <50 -> 0.8, <65 -> 0.6, >=65 -> 0.4). `maxAge: null`
  -- representa "sin techo" (el tramo >=65), igual convención que
  -- `maxIncome: null` en banking_params.
  probabilities   JSONB NOT NULL,

  -- Supuestos financieros generales del motor. Shape esperado:
  -- { "annualInterestRate": 0.045 }
  -- Replica ANNUAL_INTEREST_RATE (lib/uf-preevaluation.ts). NO incluye
  -- UF_VALUE_CLP -- el valor de la UF queda explícitamente fuera del
  -- congelamiento de versión: siempre se usa en vivo (placeholder hoy,
  -- API de valor UF actualizado en producción real), nunca se ancla a una
  -- versión histórica de wizard_variable_sets.
  assumptions     JSONB NOT NULL,

  status      TEXT NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft','active','archived')),
  note        TEXT,
  simulated_at TIMESTAMPTZ,
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, version)
);

COMMENT ON TABLE wizard_variable_sets IS
  'Versiones de configuración del motor de pre-evaluación (plazo de crédito, umbrales de calificación, parámetros bancarios, probabilidades, supuestos), editables desde Admin. Fallback: defaults hardcodeados en lib/uf-preevaluation.ts, lib/income-types.ts y lib/proposal-risk.ts si no hay fila activa. applications.wizard_variable_set_id ancla cada solicitud a la versión vigente al momento de su primer cálculo.';

COMMENT ON COLUMN wizard_variable_sets.loan_terms IS
  'Plazo del crédito. Shape: {"maxAgeAtApplication":65,"fallbackYears":25,"tiers":{}}. "tiers" es placeholder -- matriz edad x nivel profesional pendiente de un agente C1 posterior.';

COMMENT ON COLUMN wizard_variable_sets.qualification IS
  'Umbrales mínimos de calificación. Shape: {"minQualifyingUF":1700,"minQualifyingTotalIncomeCLP":1300000}.';

COMMENT ON COLUMN wizard_variable_sets.banking_params IS
  'Parámetros de los 3 gates bancarios (RRD/Carga Financiera/Leverage). Shape: {"minRentaDividendoRatio":3,"cargaFinancieraTiers":[...],"leverageTiers":[...],"shortTermDebtAmortizationMonths":12}. "maxIncome": null representa el tramo sin techo (Infinity).';

COMMENT ON COLUMN wizard_variable_sets.probabilities IS
  'Porcentajes de probabilidad de aprobación. Shape: {"bandDifficulty":{...},"professionalLevelProbabilityCap":{...},"pensionAgeTiers":[...]}. "maxAge": null representa el tramo sin techo (>=65 años).';

COMMENT ON COLUMN wizard_variable_sets.assumptions IS
  'Supuestos financieros generales. Shape: {"annualInterestRate":0.045}. NO incluye UF_VALUE_CLP (valor de UF siempre en vivo, nunca congelado por versión).';

COMMENT ON COLUMN wizard_variable_sets.status IS
  'draft: en edición/simulación, no afecta cálculos en curso. active: única versión vigente por org para nuevos cálculos. archived: histórica, referenciada solo por applications.wizard_variable_set_id de solicitudes ya ancladas.';

COMMENT ON COLUMN wizard_variable_sets.simulated_at IS
  'Timestamp de la última simulación ejecutada sobre esta versión en estado draft, antes de publicarla como active (flujo de validación previa a producción).';

-- Solo puede haber UNA versión activa por organización a la vez.
CREATE UNIQUE INDEX IF NOT EXISTS idx_wizard_variable_sets_active_per_org
  ON wizard_variable_sets (org_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_wizard_variable_sets_org_id ON wizard_variable_sets (org_id);

-- Seed: versión 1, activa, con los MISMOS valores que los defaults
-- hardcodeados hoy en lib/uf-preevaluation.ts, lib/income-types.ts y
-- lib/proposal-risk.ts -- deben mantenerse en sync manualmente si se cambia
-- uno u otro lado hasta que el motor consuma esta tabla en vivo.
INSERT INTO wizard_variable_sets (
  org_id, version,
  loan_terms, qualification, banking_params, probabilities, assumptions,
  status, note, created_by
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  1,
  '{"maxAgeAtApplication": 65, "fallbackYears": 25, "tiers": {}}'::jsonb,
  '{"minQualifyingUF": 1700, "minQualifyingTotalIncomeCLP": 1300000}'::jsonb,
  '{
     "minRentaDividendoRatio": 3,
     "cargaFinancieraTiers": [
       {"maxIncome": 2000000, "maxRatio": 0.4},
       {"maxIncome": 4000000, "maxRatio": 0.5},
       {"maxIncome": null, "maxRatio": 0.55}
     ],
     "leverageTiers": [
       {"maxIncome": 2000000, "maxMultiple": 8},
       {"maxIncome": null, "maxMultiple": 12}
     ],
     "shortTermDebtAmortizationMonths": 12
   }'::jsonb,
  '{
     "bandDifficulty": {
       "1": 0.95, "1-2": 0.83, "2-3": 0.71,
       "3-4": 0.59, "4-5": 0.47, "5-6": 0.35
     },
     "professionalLevelProbabilityCap": {
       "profesional": 90, "tecnico": 80
     },
     "pensionAgeTiers": [
       {"maxAge": 50, "multiplier": 0.8},
       {"maxAge": 65, "multiplier": 0.6},
       {"maxAge": null, "multiplier": 0.4}
     ]
   }'::jsonb,
  '{"annualInterestRate": 0.045}'::jsonb,
  'active',
  'Versión inicial — replica exactamente los valores hardcodeados en el código a la fecha de esta migración',
  NULL
)
ON CONFLICT (org_id, version) DO NOTHING;
