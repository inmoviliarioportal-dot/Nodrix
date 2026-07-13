-- =============================================================================
-- audit_fn.sql — Función reutilizable de auditoría + trigger de cambio de stage
-- =============================================================================
-- Requiere que database/schema.sql ya haya sido aplicado (tablas applications,
-- application_stage_history y audit_events deben existir).

-- -----------------------------------------------------------------------------
-- log_audit_event: helper genérico para insertar en audit_events desde
-- cualquier trigger o llamada explícita del backend (Route Handlers).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION log_audit_event(
    p_org_id        UUID,
    p_entity_type   TEXT,
    p_entity_id     UUID,
    p_action        TEXT,
    p_actor_user_id UUID,
    p_before        JSONB,
    p_after         JSONB
) RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO audit_events (org_id, entity_type, entity_id, action, actor_user_id, before, after)
    VALUES (p_org_id, p_entity_type, p_entity_id, p_action, p_actor_user_id, p_before, p_after)
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- trg_fn_applications_stage_audit: trigger que dispara en cada UPDATE de
-- applications.stage. Registra la transición en application_stage_history
-- (detalle específico del dominio) Y en audit_events (bitácora genérica).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_fn_applications_stage_audit()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE' AND NEW.stage IS DISTINCT FROM OLD.stage) THEN
        INSERT INTO application_stage_history (application_id, from_stage, to_stage, actor_user_id, note)
        VALUES (NEW.id, OLD.stage, NEW.stage, NULL, NULL);

        PERFORM log_audit_event(
            NEW.org_id,
            'application',
            NEW.id,
            'stage_change',
            NULL,
            jsonb_build_object('stage', OLD.stage),
            jsonb_build_object('stage', NEW.stage)
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_applications_stage_audit ON applications;
CREATE TRIGGER trg_applications_stage_audit
    AFTER UPDATE ON applications
    FOR EACH ROW
    EXECUTE FUNCTION trg_fn_applications_stage_audit();

-- -----------------------------------------------------------------------------
-- Nota de uso: para transiciones que requieren registrar actor_user_id o note
-- (ej. "Asesor Juan aprobó documentos"), el backend puede:
--   1) Hacer el UPDATE del stage (el trigger registra el cambio automático), y
--   2) Hacer un UPDATE adicional a la última fila de application_stage_history
--      para completar actor_user_id/note, o
--   3) Llamar directamente log_audit_event(...) desde Route Handlers cuando
--      necesite mayor control (ej. acciones que no son cambio de stage).
-- =============================================================================
