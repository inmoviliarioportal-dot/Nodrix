import { createSupabaseServiceRoleClient } from "@/lib/supabase";
import type { UserRole } from "@/app/api/_shared";

/** Módulos configurables para roles personalizados. */
export const PERMISSION_MODULES = [
  "bandeja",
  "visitas",
  "documentos",
  "scoring",
  "usuarios",
  "reportes",
  "propiedades",
  "variables",
] as const;

export type PermissionModule = (typeof PERMISSION_MODULES)[number];
export type PermissionLevel = "none" | "view" | "edit";

export const PERMISSION_MODULE_LABELS: Record<PermissionModule, string> = {
  bandeja: "Bandeja de leads",
  visitas: "Visitas",
  documentos: "Documentos",
  scoring: "Scoring",
  usuarios: "Usuarios",
  reportes: "Reportes",
  propiedades: "Propiedades y regiones",
  variables: "Variables del wizard",
};

export type PermissionMap = Record<PermissionModule, PermissionLevel>;

const NONE_ALL: PermissionMap = {
  bandeja: "none",
  visitas: "none",
  documentos: "none",
  scoring: "none",
  usuarios: "none",
  reportes: "none",
  propiedades: "none",
  variables: "none",
};

const EDIT_ALL: PermissionMap = {
  bandeja: "edit",
  visitas: "edit",
  documentos: "edit",
  scoring: "edit",
  usuarios: "edit",
  reportes: "edit",
  propiedades: "edit",
  variables: "edit",
};

/** Permisos por defecto de los roles fijos del sistema. `admin` es
 * superusuario y nunca se restringe. `gerencia` es CONFIGURABLE por admin
 * (ver `role_permissions` / `getGerenciaPermissionOverride` más abajo) --
 * este EDIT_ALL es solo el fallback mientras no exista una fila guardada. */
export const BUILTIN_ROLE_PERMISSIONS: Record<Exclude<UserRole, "custom">, PermissionMap> = {
  cliente: NONE_ALL,
  asesor: { ...EDIT_ALL, usuarios: "none" },
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
