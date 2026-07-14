import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase";
import { getUserRole, type UserRole } from "@/app/api/_shared";

/**
 * Server Component guard for staff-only route groups (backoffice, admin).
 * Unlike `requireAuth`/`requireRole` (which return a `Response` for Route
 * Handlers), this redirects directly — the right shape for a `layout.tsx`
 * that wraps a page tree.
 *
 * - Not authenticated -> `/auth/login`
 * - Authenticated but wrong role -> `/dashboard` (their own portal)
 */
export async function requireRolePage(allowedRoles: UserRole[]) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const role = await getUserRole(user.id);
  if (!allowedRoles.includes(role)) {
    redirect("/dashboard");
  }

  return { user, role };
}
