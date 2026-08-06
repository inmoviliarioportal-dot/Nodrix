import { createSupabaseServiceRoleClient } from "@/lib/supabase";
import type { UserRole } from "@/app/api/_shared";
import { NAV_ITEMS, type NavPermissionKey } from "@/lib/nav-registry";

/**
 * Módulos configurables para roles personalizados.
 *
 * DERIVADO de `NAV_REGISTRY` (lib/nav-registry.ts) — una vista del menú = un
 * permiso. NO agregar claves a mano acá: agregar el item al registro y
 * aparece solo, tanto en el menú como en la matriz de permisos. Si alguna vez
 * hace falta un permiso que no corresponde a una vista del menú, concaténalo
 * acá explícitamente (hoy no hay ninguno).
 *
 * Se eliminaron `documentos` y `scoring`: existían en la lista pero cero
 * guards los consultaban (`requirePermission` / `requirePermissionPage` /
 * `hasPermission`), o sea que no protegían nada y solo le hacían creer al
 * admin que restringían algo. Si la revisión documental necesita permiso
 * propio en el futuro, se agrega al registro.
 */
export const PERMISSION_MODULES: readonly NavPermissionKey[] = NAV_ITEMS.map((item) => item.key);

/** Unión de literales derivada del registro, NO `string`: una clave mal
 * escrita en cualquier guard es un error de compilación, no un permiso que
 * falla en silencio. Ver `NavPermissionKey` en lib/nav-registry.ts. */
export type PermissionModule = NavPermissionKey;
export type PermissionLevel = "none" | "view" | "edit";

// `Object.fromEntries` siempre devuelve `{[k: string]: V}` — TypeScript no
// puede saber que las llaves cubren exactamente la unión. El cast es seguro
// porque ambos se construyen recorriendo el propio `NAV_ITEMS`/
// `PERMISSION_MODULES`, así que por construcción no falta ninguna clave.
export const PERMISSION_MODULE_LABELS = Object.fromEntries(
  NAV_ITEMS.map((item) => [item.key, item.permissionLabel])
) as Record<PermissionModule, string>;

export type PermissionMap = Record<PermissionModule, PermissionLevel>;

/** Construidos programáticamente recorriendo `PERMISSION_MODULES`. Antes eran
 * objetos literales que había que editar a mano — esa era exactamente la
 * fuente del desajuste que dejó "variables" fuera de la matriz. */
function buildPermissionMap(level: PermissionLevel): PermissionMap {
  return Object.fromEntries(PERMISSION_MODULES.map((module) => [module, level])) as PermissionMap;
}

const NONE_ALL: PermissionMap = buildPermissionMap("none");
const EDIT_ALL: PermissionMap = buildPermissionMap("edit");

/**
 * Split de permisos (migración 035): claves viejas que cubrían más de una
 * vista, y las claves nuevas que heredan su nivel.
 *
 *   reportes    -> kpis          (antes un permiso cubría KPIs + Reportes)
 *   usuarios    -> asignaciones  (antes cubría Mantenedor + Asignar asesor)
 *   propiedades -> regiones      (antes cubría Crear + Regiones)
 *
 * La clave vieja SOBREVIVE con su valor, pero ahora significa solo su propia
 * vista. Ver `normalizePermissionMap`.
 */
const LEGACY_KEY_INHERITANCE: { from: string; to: PermissionModule }[] = [
  { from: "reportes", to: "kpis" },
  { from: "usuarios", to: "asignaciones" },
  { from: "propiedades", to: "regiones" },
];

/** Permisos por defecto de los roles fijos del sistema. `admin` es
 * superusuario y nunca se restringe. `gerencia` es CONFIGURABLE por admin
 * (ver `role_permissions` / `getGerenciaPermissionOverride` más abajo) --
 * este EDIT_ALL es solo el fallback mientras no exista una fila guardada. */
export const BUILTIN_ROLE_PERMISSIONS: Record<Exclude<UserRole, "custom">, PermissionMap> = {
  cliente: NONE_ALL,
  // Equivalente al histórico `{...EDIT_ALL, usuarios: "none"}`: con el split,
  // el viejo `usuarios` cubría tanto el Mantenedor como Asignar asesor, así
  // que hay que negar AMBAS claves nuevas para no ampliarle el acceso.
  asesor: { ...EDIT_ALL, usuarios: "none", asignaciones: "none" },
  admin: EDIT_ALL,
  gerencia: EDIT_ALL,
};

export function normalizePermissionMap(raw: unknown): PermissionMap {
  const input = (raw && typeof raw === "object" ? raw : {}) as Partial<Record<string, unknown>>;
  const result = { ...NONE_ALL };
  for (const module of PERMISSION_MODULES) {
    const value = input[module];
    if (value === "view" || value === "edit") result[module] = value;
  }

  // Migración EN CALIENTE de mapas viejos guardados en la base (respaldo
  // defensivo por si la migración SQL 035 no alcanzó alguna fila): si el mapa
  // trae una clave antigua que cubría varias vistas y la clave nueva NO viene
  // presente, la nueva hereda el nivel de la vieja. Nadie debe perder acceso
  // por el split. Se aplica solo cuando la clave nueva está ausente del JSON
  // original, para no pisar una configuración ya migrada y ajustada a mano.
  for (const { from, to } of LEGACY_KEY_INHERITANCE) {
    if (!(to in result)) continue;
    if (to in input) continue;
    const legacy = input[from];
    if (legacy === "view" || legacy === "edit") result[to] = legacy;
  }

  return result;
}

export function hasPermission(map: PermissionMap, module: PermissionModule, level: PermissionLevel): boolean {
  if (level === "none") return true;
  const current = map[module];
  if (level === "view") return current === "view" || current === "edit";
  return current === "edit";
}

/** org_id fijo del MVP (single-tenant operativo) -- ver MVP_ORG_ID en
 * app/api/auth/_constants.ts. Se repite acá (en vez de importarlo) para no
 * crear una dependencia circular entre lib/permissions.ts y app/api/_shared. */
const MVP_ORG_ID = "00000000-0000-0000-0000-000000000001";

/** Lee la configuración guardada por el admin para el rol `gerencia` (ver
 * app/admin/roles/page.tsx). `null` si nunca se guardó una -- en ese caso
 * el llamador debe caer al default EDIT_ALL para no romper el acceso de
 * gerencia en orgs que todavía no configuraron nada. */
export async function getGerenciaPermissionOverride(): Promise<PermissionMap | null> {
  const supabase = createSupabaseServiceRoleClient() as any;
  const { data } = await supabase
    .from("role_permissions")
    .select("permissions")
    .eq("org_id", MVP_ORG_ID)
    .eq("role", "gerencia")
    .maybeSingle();

  if (!data) return null;
  return normalizePermissionMap(data.permissions);
}

/**
 * Resuelve el mapa de permisos efectivo para un usuario:
 * - `admin`: siempre EDIT_ALL, nunca restringible (superusuario).
 * - `gerencia`: configurable por admin (ver `role_permissions`); si no hay
 *   configuración guardada, cae al default EDIT_ALL histórico.
 * - `cliente`/`asesor`: defaults hardcodeados.
 * - `custom`: lee la fila de `custom_roles` referenciada por
 *   `custom_role_id` (sin permisos si no hay una asignada, por seguridad).
 */
export async function getEffectivePermissions(
  role: UserRole,
  customRoleId: string | null
): Promise<PermissionMap> {
  if (role === "gerencia") {
    const override = await getGerenciaPermissionOverride();
    return override ?? BUILTIN_ROLE_PERMISSIONS.gerencia;
  }
  if (role !== "custom") return BUILTIN_ROLE_PERMISSIONS[role];
  if (!customRoleId) return NONE_ALL;

  const supabase = createSupabaseServiceRoleClient() as any;
  const { data } = await supabase
    .from("custom_roles")
    .select("permissions")
    .eq("id", customRoleId)
    .maybeSingle();

  if (!data) return NONE_ALL;
  return normalizePermissionMap(data.permissions);
}
