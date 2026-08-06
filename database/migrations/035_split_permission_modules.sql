-- 035_split_permission_modules.sql
--
-- Split de módulos de permisos: "una vista = un permiso".
--
-- Hasta ahora una sola clave de permiso cubría varias vistas del menú admin,
-- así que el admin no podía, por ejemplo, dar acceso a Reportes sin dar
-- también el dashboard de KPIs. Ahora cada vista tiene su propia clave
-- (derivada de lib/nav-registry.ts). Esta migración remapea los mapas de
-- permisos YA GUARDADOS para que NADIE PIERDA ACCESO: cada clave vieja que
-- cubría dos vistas se DUPLICA en las dos claves nuevas con el mismo nivel.
--
--   clave vieja   | cubría                          | resultado
--   --------------+---------------------------------+---------------------------
--   reportes      | /admin/dashboard + /admin/reports | kpis := reportes
--                 |                                 | reportes := reportes (solo /admin/reports)
--   usuarios      | /admin/users + /admin/assignments | asignaciones := usuarios
--                 |                                 | usuarios := usuarios (solo /admin/users)
--   propiedades   | /admin/properties + /admin/regions| regiones := propiedades
--                 |                                 | propiedades := propiedades (solo /admin/properties)
--
-- La clave vieja conserva su valor porque sigue existiendo, solo que ahora
-- significa únicamente su propia vista. La clave nueva hereda el mismo nivel
-- porque quien podía entrar a esa vista antes debe poder seguir entrando.
--
-- Además se ELIMINAN las claves `documentos` y `scoring`: nunca fueron
-- consultadas por ningún guard del código (verificado con grep sobre
-- requirePermission / requirePermissionPage / hasPermission), o sea que no
-- protegían nada y solo ensuciaban la matriz.
--
-- IDEMPOTENTE: correrla dos veces no cambia nada la segunda vez. La herencia
-- usa `NOT ? 'clave_nueva'`, así que en la segunda corrida las claves nuevas
-- ya existen y no se sobreescriben (importante: si un admin ya ajustó a mano
-- el permiso nuevo, esta migración no se lo pisa).
--
-- NO DESTRUCTIVA con claves desconocidas: se opera con `||` y `-`, nunca se
-- reemplaza el JSONB completo, así que cualquier clave ajena sobrevive.
--
-- Espejo en TypeScript: lib/permissions.ts -> normalizePermissionMap() aplica
-- la MISMA herencia en caliente, como respaldo defensivo por si alguna fila
-- no alcanzó a migrarse.

BEGIN;

-- role_permissions.permissions (JSONB) — roles fijos configurables (gerencia)
UPDATE role_permissions
SET permissions =
  (
    (
      (
        permissions
        || CASE WHEN permissions ? 'reportes'    AND NOT permissions ? 'kpis'
                THEN jsonb_build_object('kpis', permissions -> 'reportes')
                ELSE '{}'::jsonb END
      )
      || CASE WHEN permissions ? 'usuarios'      AND NOT permissions ? 'asignaciones'
              THEN jsonb_build_object('asignaciones', permissions -> 'usuarios')
              ELSE '{}'::jsonb END
    )
    || CASE WHEN permissions ? 'propiedades'     AND NOT permissions ? 'regiones'
            THEN jsonb_build_object('regiones', permissions -> 'propiedades')
            ELSE '{}'::jsonb END
  ) - 'documentos' - 'scoring'
WHERE jsonb_typeof(permissions) = 'object'
  AND (
    (permissions ? 'reportes'    AND NOT permissions ? 'kpis')
    OR (permissions ? 'usuarios'    AND NOT permissions ? 'asignaciones')
    OR (permissions ? 'propiedades' AND NOT permissions ? 'regiones')
    OR permissions ? 'documentos'
    OR permissions ? 'scoring'
  );

-- custom_roles.permissions (JSONB) — roles personalizados creados en /admin/roles
UPDATE custom_roles
SET permissions =
  (
    (
      (
        permissions
        || CASE WHEN permissions ? 'reportes'    AND NOT permissions ? 'kpis'
                THEN jsonb_build_object('kpis', permissions -> 'reportes')
                ELSE '{}'::jsonb END
      )
      || CASE WHEN permissions ? 'usuarios'      AND NOT permissions ? 'asignaciones'
              THEN jsonb_build_object('asignaciones', permissions -> 'usuarios')
              ELSE '{}'::jsonb END
    )
    || CASE WHEN permissions ? 'propiedades'     AND NOT permissions ? 'regiones'
            THEN jsonb_build_object('regiones', permissions -> 'propiedades')
            ELSE '{}'::jsonb END
  ) - 'documentos' - 'scoring'
WHERE jsonb_typeof(permissions) = 'object'
  AND (
    (permissions ? 'reportes'    AND NOT permissions ? 'kpis')
    OR (permissions ? 'usuarios'    AND NOT permissions ? 'asignaciones')
    OR (permissions ? 'propiedades' AND NOT permissions ? 'regiones')
    OR permissions ? 'documentos'
    OR permissions ? 'scoring'
  );

COMMIT;
