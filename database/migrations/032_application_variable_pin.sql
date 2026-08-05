-- =============================================================================
-- Application Variable Pin — Anclaje de cada solicitud a su versión de
-- parámetros financieros
-- =============================================================================
-- Objetivo: ancla qué versión de wizard_variable_sets se usó para el cálculo
-- de pre-evaluación de esta solicitud, para que cambios posteriores de
-- parámetros (nuevas versiones publicadas en wizard_variable_sets) NUNCA
-- alteren el resultado que ya vio un cliente existente.
--
-- Se fija (INSERT) la primera vez que se calcula la pre-evaluación de la
-- solicitud, y solo se re-ancla a una versión distinta cuando el cliente
-- edita sus datos financieros (endpoint update-financial-profile) y el
-- cálculo se rehace desde cero.
--
-- NULL significa solicitud histórica anterior a este mecanismo (creada antes
-- de que existiera esta columna) -- se resuelve a la versión 1 de
-- wizard_variable_sets por lógica de aplicación, no por esta migración (no
-- se hace backfill automático acá para no asumir qué versión corresponde a
-- cada solicitud histórica sin revisión).
-- =============================================================================

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS wizard_variable_set_id UUID
    REFERENCES wizard_variable_sets(id);

COMMENT ON COLUMN applications.wizard_variable_set_id IS
  'Ancla la versión de wizard_variable_sets vigente cuando se calculó por primera vez la pre-evaluación de esta solicitud. Un cambio de parámetros publicado después no debe alterar el resultado ya calculado. NULL = solicitud histórica anterior a este mecanismo, resuelta a la versión 1 por lógica de aplicación.';
