-- Permisos configurables para TODOS los perfiles configurables, no solo
-- `gerencia`. La migración 030 creó `role_permissions` con
-- CHECK (role IN ('gerencia')), lo que dejaba al admin sin forma de ajustar
-- el menú del perfil `asesor` (los usuarios se asocian a perfiles, así que
-- configurar el perfil es la única palanca real).
--
-- Perfiles configurables: 'asesor', 'gerencia'.
--
-- ⚠️ `admin` QUEDA FUERA DE FORMA DELIBERADA Y PERMANENTE.
--    `admin` es superusuario: es el único rol que puede entrar a /admin/roles
--    y editar esta misma configuración. Si se pudiera restringir, un admin
--    podría quitarse (o quitarle al resto) el acceso a la propia pantalla de
--    permisos y dejar el sistema SIN NADIE capaz de administrarlo, sin
--    camino de recuperación desde la UI (solo SQL manual sobre la base).
--    Es un candado anti-lockout, no una limitación temporal: NO ampliar este
--    CHECK a 'admin' en migraciones futuras.
--    Además, lib/permissions.ts::getEffectivePermissions devuelve EDIT_ALL
--    para `admin` sin consultar esta tabla, así que una fila insertada a mano
--    tampoco tendría efecto (defensa en profundidad).
--
-- `cliente` tampoco se incluye: no accede a /admin ni a /backoffice, así que
-- no tiene ninguna vista del menú que configurar. `custom` se gestiona por
-- fila en `custom_roles`, no acá.

ALTER TABLE role_permissions
    DROP CONSTRAINT IF EXISTS role_permissions_role_check;

ALTER TABLE role_permissions
    ADD CONSTRAINT role_permissions_role_check
    CHECK (role IN ('asesor', 'gerencia'));
