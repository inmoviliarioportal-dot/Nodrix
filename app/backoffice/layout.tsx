import { requireRolePage } from "@/lib/auth-guards"

/**
 * Guard for the whole `/backoffice/*` tree: only `asesor`, `admin` and
 * `gerencia` roles may enter (an `admin`/`gerencia` can act as an asesor
 * too). Anyone else is redirected — see `requireRolePage`.
 */
export default async function BackofficeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireRolePage(["asesor", "admin", "gerencia"])
  return <>{children}</>
}
