-- =============================================================================
-- Migración 002: Activación de Row-Level Security (multi-tenant real)
-- =============================================================================
-- NO SE EJECUTA EN EL MVP. Este archivo queda listo para el día en que exista
-- más de una organización y se requiera aislamiento estricto por tenant a
-- nivel de base de datos (en vez de solo a nivel de aplicación).
--
-- Prerrequisito: el JWT emitido por Supabase Auth debe incluir un claim
-- `org_id` (custom claim), y cada request debe setear:
--   SET LOCAL app.current_org_id = '<org_id del usuario autenticado>';
-- (Supabase permite esto vía `auth.jwt()` directamente en las políticas,
-- lo cual es la forma recomendada en vez de current_setting manual).
--
-- Aplicar con: psql -f database/migrations/002_rls.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- USERS
-- -----------------------------------------------------------------------------
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_users ON users
    USING (org_id = (auth.jwt() ->> 'org_id')::UUID);

-- -----------------------------------------------------------------------------
-- CUSTOMERS
-- -----------------------------------------------------------------------------
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_customers ON customers
    USING (org_id = (auth.jwt() ->> 'org_id')::UUID);

-- -----------------------------------------------------------------------------
-- APPLICATIONS
-- -----------------------------------------------------------------------------
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_applications ON applications
    USING (org_id = (auth.jwt() ->> 'org_id')::UUID);

-- -----------------------------------------------------------------------------
-- APPLICATION_STAGE_HISTORY (aislado vía join implícito con applications,
-- pero se agrega org_id-like check a través de la aplicación referenciada)
-- -----------------------------------------------------------------------------
ALTER TABLE application_stage_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_application_stage_history ON application_stage_history
    USING (
        application_id IN (
            SELECT id FROM applications
            WHERE org_id = (auth.jwt() ->> 'org_id')::UUID
        )
    );

-- -----------------------------------------------------------------------------
-- DOCUMENTS
-- -----------------------------------------------------------------------------
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_documents ON documents
    USING (org_id = (auth.jwt() ->> 'org_id')::UUID);

-- -----------------------------------------------------------------------------
-- PROPERTIES
-- -----------------------------------------------------------------------------
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_properties ON properties
    USING (org_id = (auth.jwt() ->> 'org_id')::UUID);

-- -----------------------------------------------------------------------------
-- VISITS
-- -----------------------------------------------------------------------------
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_visits ON visits
    USING (org_id = (auth.jwt() ->> 'org_id')::UUID);

-- -----------------------------------------------------------------------------
-- MORTGAGE_OPERATIONS
-- -----------------------------------------------------------------------------
ALTER TABLE mortgage_operations ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_mortgage_operations ON mortgage_operations
    USING (org_id = (auth.jwt() ->> 'org_id')::UUID);

-- -----------------------------------------------------------------------------
-- DEED_APPOINTMENTS
-- -----------------------------------------------------------------------------
ALTER TABLE deed_appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_deed_appointments ON deed_appointments
    USING (org_id = (auth.jwt() ->> 'org_id')::UUID);

-- -----------------------------------------------------------------------------
-- CLOSURES
-- -----------------------------------------------------------------------------
ALTER TABLE closures ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_closures ON closures
    USING (org_id = (auth.jwt() ->> 'org_id')::UUID);

-- -----------------------------------------------------------------------------
-- AUDIT_EVENTS
-- -----------------------------------------------------------------------------
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_audit_events ON audit_events
    USING (org_id = (auth.jwt() ->> 'org_id')::UUID);

-- NOTA: `organizations` no lleva RLS de aislamiento por org_id (es la tabla
-- raíz de tenants); si se requiere, se restringe por rol de superadmin.
