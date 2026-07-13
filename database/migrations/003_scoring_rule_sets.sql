-- =============================================================================
-- Scoring Rule Sets — Pesos y umbrales de scoring configurables por Admin
-- =============================================================================
-- Objetivo: permitir que un administrador modifique más adelante (Release 3 —
-- Admin/Gerencia) los pesos por factor y los umbrales de categoría del motor
-- de scoring (lib/scoring.ts / scoring_fn.sql), SIN tocar código ni desplegar.
--
-- Diseño: versionado por fila (nunca se hace UPDATE de una fila activa; se
-- inserta una nueva versión y se desactiva la anterior), para mantener
-- trazabilidad de qué reglas se aplicaron a una solicitud histórica
-- (applications.stage_history / audit_events ya registran cuándo cambió el
-- estado; scoring_history — si se agrega en el futuro — podría referenciar
-- scoring_rule_sets.id + version para auditoría completa).
--
-- Esta tabla se aplica en Capa 0 (multi-tenant ready: org_id desde el día 1),
-- pero el ENDPOINT y la UI para editarla se construyen recién en Release 3
-- (Admin). Mientras tanto, el motor de scoring sigue usando los defaults
-- hardcodeados en lib/scoring.ts si no encuentra una fila activa (fallback
-- seguro, ver loadActiveScoringConfig en lib/scoring.ts).
-- =============================================================================

CREATE TABLE IF NOT EXISTS scoring_rule_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  version INTEGER NOT NULL,

  -- Pesos por factor (deben sumar 100). Shape esperado:
  -- { "SALARIO": 35, "AHORRO": 25, "ESTABILIDAD_LABORAL": 20, "CARGA_FINANCIERA": 20 }
  weights JSONB NOT NULL,

  -- Umbrales de categoría. Shape esperado:
  -- { "BRONCE": {"min":0,"max":39}, "PLATA": {"min":40,"max":59},
  --   "ORO": {"min":60,"max":79}, "PLATINO": {"min":80,"max":100} }
  thresholds JSONB NOT NULL,

  is_active BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (org_id, version)
);

COMMENT ON TABLE scoring_rule_sets IS
  'Versiones de configuración del motor de scoring (pesos/umbrales), editables desde Admin en Release 3. Fallback: defaults hardcodeados en lib/scoring.ts si no hay fila activa.';

-- Solo puede haber UNA versión activa por organización a la vez.
CREATE UNIQUE INDEX IF NOT EXISTS idx_scoring_rule_sets_active_per_org
  ON scoring_rule_sets (org_id)
  WHERE is_active;

CREATE INDEX IF NOT EXISTS idx_scoring_rule_sets_org_id ON scoring_rule_sets (org_id);

-- Seed: versión 1, activa, con los MISMOS valores que los defaults de
-- lib/scoring.ts (FACTOR_WEIGHTS / SCORING_THRESHOLDS) — deben mantenerse
-- en sync manualmente si se cambia uno u otro lado.
INSERT INTO scoring_rule_sets (org_id, version, weights, thresholds, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  1,
  '{"SALARIO": 35, "AHORRO": 25, "ESTABILIDAD_LABORAL": 20, "CARGA_FINANCIERA": 20}'::jsonb,
  '{"BRONCE": {"min":0,"max":39}, "PLATA": {"min":40,"max":59}, "ORO": {"min":60,"max":79}, "PLATINO": {"min":80,"max":100}}'::jsonb,
  true
)
ON CONFLICT (org_id, version) DO NOTHING;
