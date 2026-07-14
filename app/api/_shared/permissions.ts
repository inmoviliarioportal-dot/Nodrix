import type { User } from "@supabase/supabase-js";
import { apiError, HTTP_STATUS } from "./errors";
import { requireAuth } from "./auth";
import { getUserRoleAndCustomRoleId, type UserRole } from "./roles";
import {
  getEffectivePermissions,
  hasPermission,
  type PermissionLevel,
  type PermissionMap,
  type PermissionModule,
} from "@/lib/permissions";

export type PermissionAuthResult =
  | { authorized: true; user: User; role: UserRole; permissions: PermissionMap }
  | { authorized: false; response: Response };

/**
 * Como `requireRole`, pero autoriza por permiso de módulo en vez de por
 * nombre de rol fijo -- así un usuario con `role = 'custom'` puede acceder
 * si su rol personalizado le da `view`/`edit` sobre ese módulo, sin tener
 * que enumerar 'custom' en cada allowlist de rol.
 */
export async function requirePermission(
  module: PermissionModule,
  level: PermissionLevel
): Promise<PermissionAuthResult> {
  const auth = await requireAuth();
  if (!auth.authorized) return auth;

  const { role, customRoleId } = await getUserRoleAndCustomRoleId(auth.user.id);
  const permissions = await getEffectivePermissions(role, customRoleId);

  if (!hasPermission(permissions, module, level)) {
    return {
      authorized: false,
      response: apiError(
        "No tienes permisos para acceder a este recurso.",
        HTTP_STATUS.FORBIDDEN,
        "FORBIDDEN_PERMISSION"
      ),
    };
  }

  return { authorized: true, user: auth.user, role, permissions };
}
