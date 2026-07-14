import { requireAuthPage } from "@/lib/auth-guards"

/**
 * Guard for the whole `/dashboard/*` tree (Portal Cliente): any signed-in
 * user may enter, but anonymous visitors are redirected to `/auth/login`
 * instead of seeing the dashboard shell with a silent 401 — see
 * `requireAuthPage`.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAuthPage()
  return <>{children}</>
}
