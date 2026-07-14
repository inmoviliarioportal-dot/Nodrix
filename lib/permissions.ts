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
};

export type PermissionMap = Record<PermissionModule, PermissionLevel>;

const NONE_ALL: PermissionMap = {
  bandeja: "none",
  visitas: "none",
  documentos: "none",
  scoring: "none",
  usuarios: "none",
  reportes: "none",
};

const EDIT_ALL: PermissionMap = {
  bandeja: "edit",
  visitas: "edit",
  documentos: "edit",
  scoring: "edit",
  usuarios: "edit",
  reportes: "edit",
};

/** Permisos por defecto de los roles fijos del sistema (no configurables). */
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

/**
 * Resuelve el mapa de permisos efectivo para un usuario: los roles fijos
 * tienen defaults hardcodeados; `role === 'custom'` lee la fila de
 * `custom_roles` referenciada por `custom_role_id` (sin permisos si no
 * hay una asignada, por seguridad).
 */
export async function getEffectivePermissions(
  role: UserRole,
  customRoleId: string | null
): Promise<PermissionMap> {
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
