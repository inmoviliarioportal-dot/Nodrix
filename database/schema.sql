-- =============================================================================
-- Plataforma Inmobiliaria Inteligente — Schema PostgreSQL (Supabase)
-- =============================================================================
-- Multi-tenant READY (org_id en toda tabla de negocio) pero SINGLE-TENANT
-- operativo en el MVP. RLS está DEFINIDO pero DESHABILITADO (ver sección RLS
-- al final): activar multi-tenancy real en el futuro debe ser trivial.
--
-- Aplica limpio contra un Postgres 15 vacío:
--   psql -U postgres -d postgres -f database/schema.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- EXTENSIONES
-- -----------------------------------------------------------------------------
-- pgcrypto trae gen_random_uuid() y está disponible por defecto en Supabase.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- ORGANIZATIONS
-- -----------------------------------------------------------------------------
-- Tenant raíz. En MVP solo existe UNA fila (org fija), pero el modelo ya
-- soporta múltiples organizaciones para el futuro multi-tenant real.
CREATE TABLE IF NOT EXISTS organizations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL UNIQUE,
    plan        TEXT NOT NULL DEFAULT 'mvp',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fila fija usada como org_id por defecto durante el MVP single-tenant.
-- Toda tabla de negocio referencia esta org mientras no exista multi-tenancy real.
INSERT INTO organizations (id, name, slug, plan)
VALUES ('00000000-0000-0000-0000-000000000001', 'Nodrix MVP', 'nodrix-mvp', 'mvp')
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- USERS (perfil/rol extendido — auth real vive en Supabase Auth / auth.users)
-- -----------------------------------------------------------------------------
-- Perfil de negocio ligado 1:1 al usuario de Supabase Auth (mismo id).
CREATE TABLE IF NOT EXISTS users (
    id          UUID PRIMARY KEY, -- == auth.users.id (Supabase Auth)
    org_id      UUID NOT NULL REFERENCES organizations(id),
    email       TEXT NOT NULL UNIQUE,
    role        TEXT NOT NULL DEFAULT 'cliente'
                CHECK (role IN ('cliente', 'asesor', 'admin', 'gerencia')),
    full_name   TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- CUSTOMERS (leads / clientes finales del portal)
-- -----------------------------------------------------------------------------
-- Datos del cliente inmobiliario. RUT se guarda hasheado (búsqueda/unicidad)
-- y cifrado (recuperación), nunca en texto plano.
CREATE TABLE IF NOT EXISTS customers (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id         UUID NOT NULL REFERENCES organizations(id),
    rut_hash       TEXT NOT NULL, -- hash determinístico (búsqueda/unicidad), no reversible
    rut_ciphertext TEXT,          -- RUT cifrado (reversible con clave de app), no texto plano
    name           TEXT NOT NULL,
    email          TEXT NOT NULL,
    phone          TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (org_id, rut_hash)
);

-- -----------------------------------------------------------------------------
-- APPLICATIONS — máquina de estados central del dominio (lead -> cierre)
-- -----------------------------------------------------------------------------
-- `stage` usa CHECK constraint sobre TEXT (ver decisión de diseño en README
-- de este schema / reporte del agente): más flexible que un ENUM nativo para
-- iterar rápido en MVP sin migraciones bloqueantes tipo ALTER TYPE.
CREATE TABLE IF NOT EXISTS applications (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id                    UUID NOT NULL REFERENCES organizations(id),
    customer_id               UUID NOT NULL REFERENCES customers(id),
    stage                     TEXT NOT NULL DEFAULT 'RECEPCIONADA'
        CHECK (stage IN (
            'RECEPCIONADA',              -- 1. Lead recibido / postulación creada
            'SCORING_COMPLETADO',        -- 2. Motor de scoring evaluó al cliente
            'DOCUMENTOS_PENDIENTES',     -- 3. Se solicitaron documentos de respaldo
            'DOCUMENTOS_APROBADOS',      -- 4. Documentos validados por asesor/admin
            'PRE_EVALUACION_COMPLETADA', -- 5. Pre-evaluación financiera (rango UF) lista
            'VISITA_COMPLETADA',         -- 6. Visita a propiedad realizada
            'ENVIADO_A_BANCO',           -- 7. Operación hipotecaria enviada a banco
            'ESCRITURACION_AGENDADA',    -- 8. Cita de notaría/escrituración agendada
            'CIERRE'                     -- 9. Proceso cerrado (venta concretada)
        )),
    scoring_category          TEXT,   -- categoría resultante del motor de scoring (ej. A/B/C)
    scoring_score             NUMERIC(6,2),
    pre_evaluation_min_uf     NUMERIC(12,2),
    pre_evaluation_max_uf     NUMERIC(12,2),
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- APPLICATION_STAGE_HISTORY — auditoría específica de transiciones de stage
-- -----------------------------------------------------------------------------
-- Registra cada cambio de estado de una postulación (quién, cuándo, por qué).
CREATE TABLE IF NOT EXISTS application_stage_history (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    from_stage     TEXT,
    to_stage       TEXT NOT NULL,
    actor_user_id  UUID REFERENCES users(id),
    note           TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- DOCUMENTS — documentos adjuntos a una postulación (cédula, liquidaciones, etc.)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS documents (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id         UUID NOT NULL REFERENCES organizations(id),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    type           TEXT NOT NULL, -- ej. 'cedula', 'liquidacion_sueldo', 'certificado_afp'
    url            TEXT NOT NULL, -- ruta en Supabase Storage
    status         TEXT NOT NULL DEFAULT 'pendiente'
        CHECK (status IN ('pendiente', 'en_revision', 'aprobado', 'rechazado')),
    extracted_data JSONB,         -- datos extraídos automáticamente (OCR / parsing)
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- PROPERTIES — catálogo de propiedades/proyectos disponibles para inversión
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS properties (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id),
    name            TEXT NOT NULL,
    price_uf        NUMERIC(12,2) NOT NULL,
    location        TEXT,
    investment_type TEXT, -- ej. 'renta', 'plusvalia', 'mixto'
    available       BOOLEAN NOT NULL DEFAULT true,
    images          JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- VISITS — visitas agendadas/realizadas a propiedades dentro de una postulación
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS visits (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id         UUID NOT NULL REFERENCES organizations(id),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    property_id    UUID NOT NULL REFERENCES properties(id),
    scheduled_at   TIMESTAMPTZ NOT NULL,
    completed_at   TIMESTAMPTZ,
    status         TEXT NOT NULL DEFAULT 'agendada'
        CHECK (status IN ('agendada', 'realizada', 'cancelada', 'no_show')),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- MORTGAGE_OPERATIONS — operación hipotecaria enviada a bancos (mock en MVP)
-- -----------------------------------------------------------------------------
-- NOTA: no hay integración bancaria real disponible; todo lo financiero/bancario
-- se registra manualmente / se simula en el MVP.
CREATE TABLE IF NOT EXISTS mortgage_operations (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id         UUID NOT NULL REFERENCES organizations(id),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    bank_name      TEXT NOT NULL,
    amount_uf      NUMERIC(12,2) NOT NULL,
    status         TEXT NOT NULL DEFAULT 'enviado'
        CHECK (status IN ('enviado', 'en_evaluacion', 'aprobado', 'rechazado')),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- DEED_APPOINTMENTS — citas de escrituración/notaría
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS deed_appointments (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id                 UUID NOT NULL REFERENCES organizations(id),
    mortgage_operation_id  UUID NOT NULL REFERENCES mortgage_operations(id) ON DELETE CASCADE,
    notary                 TEXT NOT NULL,
    scheduled_at           TIMESTAMPTZ NOT NULL,
    status                 TEXT NOT NULL DEFAULT 'agendada'
        CHECK (status IN ('agendada', 'realizada', 'reagendada', 'cancelada')),
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- CLOSURES — cierre final del proceso de venta/inversión
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS closures (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id         UUID NOT NULL REFERENCES organizations(id),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    property_id    UUID NOT NULL REFERENCES properties(id),
    final_status   TEXT NOT NULL
        CHECK (final_status IN ('exitoso', 'fallido', 'desistido')),
    closed_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- AUDIT_EVENTS — bitácora genérica de auditoría (usada por audit_fn.sql)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_events (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id         UUID NOT NULL REFERENCES organizations(id),
    entity_type    TEXT NOT NULL, -- ej. 'application', 'document', 'mortgage_operation'
    entity_id      UUID NOT NULL,
    action         TEXT NOT NULL, -- ej. 'stage_change', 'create', 'update', 'delete'
    actor_user_id  UUID REFERENCES users(id),
    before         JSONB,
    after          JSONB,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- ÍNDICES
-- =============================================================================
-- org_id en todas las tablas de negocio (soporte a futuras queries multi-tenant)
CREATE INDEX IF NOT EXISTS idx_users_org_id                    ON users (org_id);
CREATE INDEX IF NOT EXISTS idx_customers_org_id                ON customers (org_id);
CREATE INDEX IF NOT EXISTS idx_applications_org_id             ON applications (org_id);
CREATE INDEX IF NOT EXISTS idx_documents_org_id                ON documents (org_id);
CREATE INDEX IF NOT EXISTS idx_properties_org_id               ON properties (org_id);
CREATE INDEX IF NOT EXISTS idx_visits_org_id                   ON visits (org_id);
CREATE INDEX IF NOT EXISTS idx_mortgage_operations_org_id      ON mortgage_operations (org_id);
CREATE INDEX IF NOT EXISTS idx_deed_appointments_org_id        ON deed_appointments (org_id);
CREATE INDEX IF NOT EXISTS idx_closures_org_id                 ON closures (org_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_org_id             ON audit_events (org_id);

-- Índices de dominio requeridos explícitamente
CREATE INDEX IF NOT EXISTS idx_applications_stage             ON applications (stage);
CREATE INDEX IF NOT EXISTS idx_applications_customer_id        ON applications (customer_id);
CREATE INDEX IF NOT EXISTS idx_documents_application_id         ON documents (application_id);

-- Índices adicionales de soporte a dashboards / queries frecuentes
CREATE INDEX IF NOT EXISTS idx_applications_created_at         ON applications (created_at);
CREATE INDEX IF NOT EXISTS idx_documents_created_at             ON documents (created_at);
CREATE INDEX IF NOT EXISTS idx_visits_application_id            ON visits (application_id);
CREATE INDEX IF NOT EXISTS idx_visits_property_id                ON visits (property_id);
CREATE INDEX IF NOT EXISTS idx_mortgage_operations_application_id ON mortgage_operations (application_id);
CREATE INDEX IF NOT EXISTS idx_deed_appointments_mortgage_operation_id ON deed_appointments (mortgage_operation_id);
CREATE INDEX IF NOT EXISTS idx_closures_application_id           ON closures (application_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_entity                ON audit_events (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_application_stage_history_app_id   ON application_stage_history (application_id);

-- =============================================================================
-- TRIGGER: mantener updated_at fresco en applications
-- =============================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_applications_updated_at ON applications;
CREATE TRIGGER trg_applications_updated_at
    BEFORE UPDATE ON applications
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_organizations_updated_at ON organizations;
CREATE TRIGGER trg_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- FUNCIÓN DE AUDITORÍA (definición completa en database/functions/audit_fn.sql)
-- =============================================================================
-- Se incluye aquí vía \i solo como referencia de organización del proyecto;
-- en Supabase se ejecuta cada archivo por separado o se concatena en el
-- pipeline de migración. Ver database/functions/audit_fn.sql para el cuerpo.

-- =============================================================================
-- ROW-LEVEL SECURITY (RLS) — DEFINIDO PERO NO ACTIVADO EN EL MVP
-- =============================================================================
-- Las políticas quedan escritas y listas para activar el día que exista
-- multi-tenancy real (más de una organización). Para activarlas:
--   1) Ejecutar database/migrations/002_rls.sql (que hace ENABLE ROW LEVEL
--      SECURITY + CREATE POLICY sobre cada tabla de negocio).
--   2) Asegurar que el JWT de Supabase Auth incluya un claim `org_id` que
--      coincida con el org_id de la fila del usuario autenticado.
-- En el MVP, ninguna tabla tiene RLS habilitado (todo el acceso pasa por
-- Route Handlers de Next.js con la service_role key, controlando el acceso
-- a nivel de aplicación).
--
-- Ejemplo de política (ver 002_rls.sql para el set completo):
--
--   ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
--   CREATE POLICY tenant_isolation_applications ON applications
--       USING (org_id = current_setting('app.current_org_id')::UUID);
--
-- =============================================================================
