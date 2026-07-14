import { requireRolePage } from "@/lib/auth-guards"

/**
 * Guard for the whole `/admin/*` tree: only `admin` and `gerencia` roles
 * may enter. Anyone else is redirected — see `requireRolePage`.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireRolePage(["admin", "gerencia"])
  return <>{children}</>
}
