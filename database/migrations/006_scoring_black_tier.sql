-- =============================================================================
-- 006_scoring_black_tier.sql — Nueva categoría de scoring BLACK
-- =============================================================================
-- Se agrega una 5ta categoría por encima de PLATINO (para el perfil
-- financiero más alto posible), reajustando los umbrales de ORO/PLATINO.
-- Ver lib/scoring.ts (única fuente de verdad, TypeScript) para el detalle;
-- este UPDATE mantiene la fila activa de `scoring_rule_sets` en sync.
--
-- Nuevos umbrales: BRONCE 0-39, PLATA 40-59, ORO 60-74, PLATINO 75-89,
-- BLACK 90-100 (antes: BRONCE 0-39, PLATA 40-59, ORO 60-79, PLATINO 80-100).

UPDATE scoring_rule_sets
SET thresholds = '{"BRONCE": {"min":0,"max":39}, "PLATA": {"min":40,"max":59}, "ORO": {"min":60,"max":74}, "PLATINO": {"min":75,"max":89}, "BLACK": {"min":90,"max":100}}'::jsonb
WHERE is_active = true;
