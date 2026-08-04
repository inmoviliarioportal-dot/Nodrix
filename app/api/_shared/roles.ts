import type { User } from "@supabase/supabase-js";
import { createSupabaseServiceRoleClient } from "@/lib/supabase";
import { apiError, HTTP_STATUS } from "./errors";
import { requireAuth } from "./auth";

export type UserRole = "cliente" | "asesor" | "admin" | "gerencia" | "custom";

/**
 * Looks up `public.users.role` for an authenticated Supabase Auth user.
 * `public.users.id` mirrors `auth.users.id` 1:1 (see `database/schema.sql`
 * and the insert added in `app/api/auth/register/route.ts`). Defaults to
 * `"cliente"` if the row is somehow missing, which is the safest fallback
 * (least privilege) rather than throwing.
 */
export async function getUserRole(userId: string): Promise<UserRole> {
  const serviceRoleClient = createSupabaseServiceRoleClient() as any;
  const { data } = await serviceRoleClient
    .from("users")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  return (data?.role as UserRole | undefined) ?? "cliente";
}

/** Igual que `getUserRole` pero además retorna `custom_role_id` y `active`.
 * `customRoleId` es necesario para resolver los permisos reales de un
 * usuario con `role = 'custom'` (ver `lib/permissions.ts`). `active` viene
 * del mantenedor de usuarios (ver app/admin/users/page.tsx) -- un usuario
 * de backend deshabilitado conserva su sesión de Supabase Auth válida,
 * pero `requireRole`/`requireRolePage` lo tratan como no autorizado. */
export async function getUserRoleAndCustomRoleId(
  userId: string
): Promise<{ role: UserRole; customRoleId: string | null; active: boolean }> {
  const serviceRoleClient = createSupabaseServiceRoleClient() as any;
  const { data } = await serviceRoleClient
    .from("users")
    .select("role, custom_role_id, active")
    .eq("id", userId)
    .maybeSingle();

  return {
    role: (data?.role as UserRole | undefined) ?? "cliente",
    customRoleId: data?.custom_role_id ?? null,
    active: data?.active ?? true,
  };
}

export type RoleAuthResult =
  | { authorized: true; user: User; role: UserRole }
  | { authorized: false; response: Response };

/**
 * Like `requireAuth`, but additionally enforces that the authenticated
 * user's `public.users.role` is one of `allowedRoles`. Use in Route
 * Handlers that back staff-only areas (backoffice, admin).
 */
export async function requireRole(allowedRoles: UserRole[]): Promise<RoleAuthResult> {
  const auth = await requireAuth();
  if (!auth.authorized) return auth;

  const { role, active } = await getUserRoleAndCustomRoleId(auth.user.id);
  if (!active) {
    return {
      authorized: false,
      response: apiError("Tu cuenta ha sido deshabilitada.", HTTP_STATUS.FORBIDDEN, "USER_DISABLED"),
    };
  }
  if (!allowedRoles.includes(role)) {
    return {
      authorized: false,
      response: apiError(
        "No tienes permisos para acceder a este recurso.",
        HTTP_STATUS.FORBIDDEN,
        "FORBIDDEN_ROLE"
      ),
    };
  }

  return { authorized: true, user: auth.user, role };
}
