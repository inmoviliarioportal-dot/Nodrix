-- =============================================================================
-- Loan Term Tiers v2 — matriz de plazo del crédito por edad x nivel
-- profesional (agente C1 term-engine)
-- =============================================================================
-- Inserta la VERSIÓN 2 de `wizard_variable_sets` (database/migrations/
-- 031_wizard_variable_sets.sql) para la organización del MVP, copiando
-- EXACTAMENTE los otros 4 grupos (qualification, banking_params,
-- probabilities, assumptions) de la versión 1, y poblando `loan_terms.tiers`
-- con la matriz real de negocio:
--
--   Profesional: hasta 44 -> 30 años, 45-54 -> 25 años, 55-65 -> 15 años.
--   Técnico:     hasta 54 -> 25 años, 55-65 -> 15 años.
--   Ambos, 66+:  sin tramo (el motor -- lib/loan-term.ts -- devuelve
--                `years: null`, deriva a revisión del asesor, nunca lanza).
--
-- Con aval, se usa la MENOR edad entre cliente y aval (ver
-- lib/loan-term.ts::loanTermYearsFor) -- eso es lógica de aplicación, no de
-- esta migración.
--
-- IMPORTANTE: esta fila queda en status = 'draft'. NO se activa acá.
-- Activarla en producción (pasar a 'active', lo que archiva la v1 vigente)
-- es una decisión de negocio separada, que requiere correr primero
-- scripts/loan-term-impact-report.ts contra la base real y obtener
-- autorización explícita del usuario. Ver ese script para el informe de
-- impacto (cuántas solicitudes cambian de monto / dejan de calificar /
-- pasan a calificar).
-- =============================================================================

INSERT INTO wizard_variable_sets (
  org_id, version,
  loan_terms, qualification, banking_params, probabilities, assumptions,
  status, note, created_by
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  2,
  '{
     "maxAgeAtApplication": 65,
     "fallbackYears": 25,
     "tiers": {
       "profesional": [
         {"maxAge": 44, "years": 30},
         {"maxAge": 54, "years": 25},
         {"maxAge": 65, "years": 15}
       ],
       "tecnico": [
         {"maxAge": 54, "years": 25},
         {"maxAge": 65, "years": 15}
       ]
     }
   }'::jsonb,
  -- Copiado EXACTO de la versión 1 (qualification).
  '{"minQualifyingUF": 1700, "minQualifyingTotalIncomeCLP": 1300000}'::jsonb,
  -- Copiado EXACTO de la versión 1 (banking_params).
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
  -- Copiado EXACTO de la versión 1 (probabilities).
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
  -- Copiado EXACTO de la versión 1 (assumptions).
  '{"annualInterestRate": 0.045}'::jsonb,
  'draft',
  'Versión 2 — agrega la matriz real de loan_terms.tiers (edad x nivel profesional: profesional 44/54/65 -> 30/25/15 años, técnico 54/65 -> 25/15 años). Resto de los grupos idéntico a v1. NO activar sin antes correr scripts/loan-term-impact-report.ts y obtener autorización explícita.',
  NULL
)
ON CONFLICT (org_id, version) DO NOTHING;
