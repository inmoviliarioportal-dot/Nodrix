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

/**
 * Server Component guard for any authenticated area (Portal Cliente).
 * Redirects to `/auth/login` when there is no session. Unlike
 * `requireRolePage`, it does not restrict by role — any signed-in user
 * (cliente, asesor, admin, gerencia) may view `/dashboard`.
 *
 * Without this, `/dashboard` rendered its shell for anonymous visitors too
 * (the client component's `fetch("/api/auth/user")` just failed silently
 * with a 401 and showed a generic error instead of redirecting) — clicking
 * "Dashboard" while logged out looked like a broken logged-in state.
 */
export async function requireAuthPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return { user };
}
