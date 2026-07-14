-- Roles personalizados: el admin puede crear roles con permisos por módulo
-- (ninguno / ver / editar) en vez de estar limitado a asesor/admin/gerencia.
-- Un usuario con role = 'custom' obtiene sus permisos reales desde la fila
-- referenciada por custom_role_id (ver lib/permissions.ts).

CREATE TABLE IF NOT EXISTS custom_roles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      UUID NOT NULL REFERENCES organizations(id),
    name        TEXT NOT NULL,
    permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_custom_roles_org_id ON custom_roles (org_id);

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS custom_role_id UUID REFERENCES custom_roles(id);

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users
    ADD CONSTRAINT users_role_check
    CHECK (role IN ('cliente', 'asesor', 'admin', 'gerencia', 'custom'));
