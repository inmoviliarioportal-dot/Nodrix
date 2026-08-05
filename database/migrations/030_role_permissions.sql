-- Permisos configurables para el rol fijo "gerencia" -- antes era
-- EDIT_ALL hardcodeado (sin forma de restringirlo desde el admin). Reusa
-- el mismo PermissionMap que custom_roles.permissions (jsonb por módulo:
-- 'none' | 'view' | 'edit'). Solo aplica a `gerencia`: `admin` sigue
-- siendo superusuario sin restricciones, y `cliente`/`asesor` no tienen fila
-- acá (sus permisos siguen hardcodeados en lib/permissions.ts).
--
-- Sin fila para una org -> se asume el default histórico (EDIT_ALL) para
-- no romper accesos existentes al desplegar; el admin debe entrar a
-- /admin/roles y guardar una configuración explícita para empezar a
-- restringir el menú de gerencia.
CREATE TABLE IF NOT EXISTS role_permissions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      UUID NOT NULL REFERENCES organizations(id),
    role        TEXT NOT NULL CHECK (role IN ('gerencia')),
    permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (org_id, role)
);
