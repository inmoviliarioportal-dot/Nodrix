/**
 * NAV_REGISTRY — fuente ÚNICA de verdad de la navegación de /admin y de la
 * matriz de permisos.
 *
 * Antes, agregar una vista nueva obligaba a tocar 5 lugares distintos
 * (`PERMISSION_MODULES`, `PERMISSION_MODULE_LABELS`, `NONE_ALL`, `EDIT_ALL` y
 * una copia hardcodeada de la lista en app/admin/roles/page.tsx). Se
 * desincronizaron: "Variables del wizard" nunca apareció en la matriz de
 * permisos. Ahora se declara UNA vez acá y todo lo demás se deriva:
 *
 *   NAV_REGISTRY ──> app/admin/layout.tsx      (menú, filtrado por permiso)
 *                └─> lib/permissions.ts        (PERMISSION_MODULES, labels,
 *                                               NONE_ALL, EDIT_ALL)
 *
 * REGLA: una vista = un permiso. `key` es la clave de permiso y debe ser
 * única en todo el registro.
 *
 * EXCEPCIÓN DELIBERADA — /admin/roles NO está en este registro y no tiene
 * clave de permiso: es admin-only fijo, no configurable. Es la pantalla donde
 * se configuran los permisos de TODOS (incluidos los de quien la abre), así
 * que hacerla configurable sería una escalada de privilegios: un rol con
 * permiso sobre "roles" podría auto-otorgarse cualquier otro permiso. Se
 * sigue agregando a mano en app/admin/layout.tsx bajo `if (isAdmin)`.
 */

export interface NavItemDef {
  /** Clave de permiso — única en todo el registro. */
  key: string;
  href: string;
  label: string;
  /** Debe existir en ICON_MAP de components/Layout.tsx. */
  iconKey: string;
  /** Etiqueta mostrada en la matriz de permisos (más descriptiva que `label`,
   * que se muestra dentro de su grupo en el menú y por eso puede ser corta). */
  permissionLabel: string;
}

export interface NavGroupDef {
  label: string;
  iconKey: string;
  items: readonly NavItemDef[];
}

/**
 * `as const satisfies` en vez de una anotación de tipo directa: `satisfies`
 * valida la forma contra `NavGroupDef[]` (si a un item le falta `href` o
 * sobra un campo, no compila), pero `as const` PRESERVA los literales de
 * cada `key`. Eso permite derivar abajo una unión de literales en vez de
 * `string` -- sin esto, `hasPermission(perms, "variabels", "view")` (con
 * typo) compilaría y devolvería siempre false en silencio.
 */
export const NAV_REGISTRY = [
  {
    label: "Dashboard",
    iconKey: "chart",
    items: [
      {
        key: "kpis",
        href: "/admin/dashboard",
        label: "KPIs",
        iconKey: "chart",
        permissionLabel: "Dashboard de KPIs",
      },
      {
        key: "reportes",
        href: "/admin/reports",
        label: "Reportes",
        iconKey: "report",
        permissionLabel: "Reportes",
      },
    ],
  },
  {
    label: "Asesor",
    iconKey: "dashboard",
    items: [
      {
        key: "bandeja",
        href: "/backoffice/queue",
        label: "Backoffice",
        iconKey: "dashboard",
        permissionLabel: "Bandeja de leads",
      },
      {
        key: "asignaciones",
        href: "/admin/assignments",
        label: "Asignar asesor",
        iconKey: "userPlus",
        permissionLabel: "Asignación de asesores",
      },
      {
        key: "visitas",
        href: "/backoffice/visits",
        label: "Visitas",
        iconKey: "calendar",
        permissionLabel: "Visitas",
      },
    ],
  },
  {
    label: "Propiedades",
    iconKey: "building",
    items: [
      {
        key: "propiedades",
        href: "/admin/properties",
        label: "Crear",
        iconKey: "building",
        permissionLabel: "Propiedades",
      },
      {
        key: "regiones",
        href: "/admin/regions",
        label: "Regiones",
        iconKey: "mapPin",
        permissionLabel: "Regiones y comunas",
      },
    ],
  },
  {
    label: "Usuarios",
    iconKey: "users",
    items: [
      {
        key: "usuarios",
        href: "/admin/users",
        label: "Mantenedor",
        iconKey: "users",
        permissionLabel: "Mantenedor de usuarios",
      },
    ],
  },
  {
    label: "Flujo",
    iconKey: "sliders",
    items: [
      {
        key: "variables",
        href: "/admin/variables",
        label: "Variables",
        iconKey: "sliders",
        permissionLabel: "Variables del flujo",
      },
    ],
  },
] as const satisfies readonly NavGroupDef[];

/**
 * Unión de literales de TODAS las claves de permiso del registro (hoy:
 * "kpis" | "reportes" | "bandeja" | ...). Es lo que hace que una clave mal
 * escrita en cualquier guard sea un error de compilación y no un permiso
 * que falla en silencio. Agregar un item al registro la extiende sola.
 */
export type NavPermissionKey = (typeof NAV_REGISTRY)[number]["items"][number]["key"];

/** Aplana un registro a la lista ordenada de sus items. Se exporta genérico
 * (recibe el registro por parámetro) para que los tests puedan verificar la
 * derivación con un registro de prueba sin mutar el real. */
export function flattenNavRegistry(registry: readonly NavGroupDef[]): NavItemDef[] {
  return registry.flatMap((group) => [...group.items]);
}

/** Todos los items del registro real, en orden de menú. Conserva el tipo
 * literal de `key` para que `PERMISSION_MODULES` sea una unión, no `string[]`. */
export const NAV_ITEMS = NAV_REGISTRY.flatMap((group) => [...group.items]);
