-- =============================================================================
-- publish_wizard_variable_set — publicación transaccional de una versión de
-- wizard_variable_sets (agente E3 variables-api)
-- =============================================================================
-- Contexto: publicar una versión nueva de wizard_variable_sets implica dos
-- UPDATEs que deben ocurrir juntos o ninguno (archivar la fila 'active'
-- anterior + activar la nueva) -- ver 031_wizard_variable_sets.sql para el
-- índice único parcial que garantiza una sola fila 'active' por org.
--
-- No existe en este proyecto un patrón de transacción multi-statement desde
-- el cliente Supabase-js en Route Handlers (revisado: ningún endpoint usa
-- `supabase.rpc(...)` todavía, y el service-role client no expone
-- `.begin()/.commit()`). El patrón existente en database/functions/ (
-- scoring_fn.sql, audit_fn.sql) es exactamente esto: lógica de negocio
-- crítica implementada como función plpgsql invocada vía RPC, para que
-- Postgres garantice la atomicidad -- cada función plpgsql corre en una
-- única transacción implícita.
--
-- Esta función además re-valida, DENTRO de la misma transacción (con
-- `FOR UPDATE` sobre la fila a publicar), los requisitos de publicación que
-- no dependen de los límites duros de negocio (esos se validan en
-- TypeScript antes de invocar el RPC, con `validateVariableSetHardLimits`
-- de lib/wizard-variables.ts, para reusar exactamente la misma lógica que
-- ya protege la ruta de lectura) -- así una publicación no puede colarse
-- aunque la fila haya sido editada directo en la base entre el chequeo en
-- la app y la llamada al RPC:
--   1. La versión debe existir para esa organización.
--   2. No debe estar ya 'active' (evita archivar+reactivar la misma fila).
--   3. `simulated_at` no puede ser NULL (el endpoint de simulación es del
--      agente E5 -- acá solo se exige que ya haya corrido).
--   4. `p_note` no puede ser NULL ni vacío (nota de cambio obligatoria).
-- =============================================================================

CREATE OR REPLACE FUNCTION publish_wizard_variable_set(
  p_org_id UUID,
  p_version INTEGER,
  p_note TEXT
)
RETURNS wizard_variable_sets
LANGUAGE plpgsql
AS $$
DECLARE
  v_target wizard_variable_sets%ROWTYPE;
  v_result wizard_variable_sets%ROWTYPE;
BEGIN
  SELECT * INTO v_target
  FROM wizard_variable_sets
  WHERE org_id = p_org_id AND version = p_version
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'wizard_variable_sets: no existe la versión % para la organización %', p_version, p_org_id
      USING ERRCODE = 'no_data_found';
  END IF;

  IF v_target.status = 'active' THEN
    RAISE EXCEPTION 'wizard_variable_sets: la versión % ya está activa', p_version
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF v_target.simulated_at IS NULL THEN
    RAISE EXCEPTION 'wizard_variable_sets: la versión % no ha sido simulada, no se puede publicar', p_version
      USING ERRCODE = 'check_violation';
  END IF;

  IF p_note IS NULL OR btrim(p_note) = '' THEN
    RAISE EXCEPTION 'wizard_variable_sets: se requiere una nota de cambio para publicar'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Archiva la fila actualmente activa de la organización (si existe).
  UPDATE wizard_variable_sets
  SET status = 'archived'
  WHERE org_id = p_org_id AND status = 'active';

  -- Activa la versión objetivo, dejando la nota de publicación.
  UPDATE wizard_variable_sets
  SET status = 'active', note = p_note
  WHERE id = v_target.id
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION publish_wizard_variable_set(UUID, INTEGER, TEXT) IS
  'Publica una versión de wizard_variable_sets de forma transaccional: archiva la fila active anterior de la org y activa la versión indicada, dentro de una única transacción de Postgres. Revalida simulated_at y note incluso si ya se validaron en la app (defensa contra ediciones directas a la fila entre el chequeo y la llamada). Los límites duros de negocio (loan_terms/banking_params/probabilities) se validan en TypeScript (lib/wizard-variables.ts) antes de invocar este RPC.';
