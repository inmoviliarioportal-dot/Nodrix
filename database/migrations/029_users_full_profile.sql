-- Datos completos de usuarios de backend (asesor/admin/gerencia) para el
-- formulario de creación y el mantenedor -- ver app/admin/users/new y
-- app/admin/users/page.tsx. `full_name` se sigue calculando a partir de
-- first_name + last_name (varios lugares del sitio lo consumen tal cual:
-- saludo de sesión, iniciales del WhatsAppBubble, etc.).
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS first_name TEXT,
    ADD COLUMN IF NOT EXISTS last_name TEXT,
    ADD COLUMN IF NOT EXISTS rut TEXT,
    ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;

-- RUT único por organización (cuando se informa) -- evita duplicar la
-- misma persona con dos cuentas de backend.
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_org_rut ON users (org_id, rut) WHERE rut IS NOT NULL;
