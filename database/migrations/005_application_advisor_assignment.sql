-- =============================================================================
-- 005_application_advisor_assignment.sql — Asignación de asesor a solicitudes
-- =============================================================================
-- Permite a admin/gerencia asignar (o reasignar) qué asesor está a cargo de
-- cada solicitud. Nullable: una solicitud puede no tener asesor asignado
-- todavía (comportamiento actual, sin romper filas existentes).

ALTER TABLE applications
    ADD COLUMN IF NOT EXISTS assigned_advisor_id UUID REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_applications_assigned_advisor_id
    ON applications (assigned_advisor_id);
