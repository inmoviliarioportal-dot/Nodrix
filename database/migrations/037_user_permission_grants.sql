-- Permisos TEMPORALES por usuario (no por rol).
--
-- REGLA DE NEGOCIO CENTRAL — SOLO ELEVAN, NUNCA RESTRINGEN:
-- Un grant de esta tabla únicamente puede SUBIR el nivel de acceso que ya da
-- el perfil del usuario (su rol fijo o su rol personalizado), según el orden
-- none < view < edit. Es decir: puede llevar `none -> view`, `none -> edit` o
-- `view -> edit`, pero JAMÁS bajar un nivel. El mapa del perfil es siempre el
-- piso mínimo garantizado. Al vencer (o al revocarse) el grant, el usuario
-- vuelve exactamente a lo que dice su perfil, sin efectos residuales.
-- Por eso `level` no admite 'none': otorgar "nada" no tiene sentido y sería
-- la única forma de expresar una restricción, que acá no existe.
--
-- VENCIMIENTO SIN JOB: `expires_at` es obligatorio y se evalúa comparándolo
-- contra `now()` EN LA CONSULTA de lectura (ver lib/temporary-grants.ts). No
-- hay proceso programado de limpieza: un grant vencido deja de aplicar por
-- construcción, aunque ningún job haya corrido nunca.
--
-- `revoked_at` permite cortar un grant antes de su vencimiento sin borrar la
-- fila: el registro histórico de quién dio qué acceso, por qué y hasta cuándo
-- se conserva siempre (auditoría). Los otorgamientos y revocaciones además
-- escriben en `audit_events` con las acciones `permission_grant_created` /
-- `permission_grant_revoked`.
CREATE TABLE IF NOT EXISTS user_permission_grants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id),
    user_id         UUID NOT NULL REFERENCES users(id),
    -- Clave de permiso: debe existir en PERMISSION_MODULES (derivado de
    -- lib/nav-registry.ts). Se valida en la API, no con un CHECK, porque el
    -- catálogo de claves vive en el código y cambia con el menú.
    permission_key  TEXT NOT NULL,
    -- Nunca 'none': los grants solo elevan (ver comentario de arriba).
    level           TEXT NOT NULL CHECK (level IN ('view', 'edit')),
    granted_by      UUID NOT NULL REFERENCES users(id),
    reason          TEXT NOT NULL CHECK (length(btrim(reason)) > 0),
    starts_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at      TIMESTAMPTZ NOT NULL,
    revoked_at      TIMESTAMPTZ,
    revoked_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Un permiso que vence antes de empezar no aplica nunca.
    CONSTRAINT user_permission_grants_window_valid CHECK (expires_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_user_permission_grants_org_id
    ON user_permission_grants (org_id);

-- Índice de la consulta caliente: "grants VIGENTES de este usuario", que
-- corre en cada request de página. Parcial sobre `revoked_at IS NULL` para
-- que las filas ya revocadas no ocupen el índice, y con `expires_at` de
-- segunda columna porque el filtro final es `expires_at > now()`.
CREATE INDEX IF NOT EXISTS idx_user_permission_grants_active
    ON user_permission_grants (user_id, expires_at)
    WHERE revoked_at IS NULL;
