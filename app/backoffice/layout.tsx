import { requireRolePage } from "@/lib/auth-guards"
import { Layout } from "@/components/Layout"

/**
 * Guard for the whole `/backoffice/*` tree: only `asesor`, `admin` and
 * `gerencia` roles may enter (an `admin`/`gerencia` can act as an asesor
 * too). Anyone else is redirected — see `requireRolePage`.
 *
 * Also provides the shared header (logo + nav + AccountMenu) — antes
 * las páginas de Backoffice no usaban `Layout` en absoluto, por lo que el
 * asesor/admin/gerencia no tenía forma de cerrar sesión ni editar sus
 * datos desde acá.
 */
export default async function BackofficeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { role } = await requireRolePage(["asesor", "admin", "gerencia"])

  const navLinks = [
    { href: "/backoffice/queue", label: "Bandeja" },
    ...(role === "admin" || role === "gerencia"
      ? [{ href: "/admin/dashboard", label: "Panel Admin" }]
      : []),
  ]

  return (
    <Layout className="bg-deep-ambient" navLinks={navLinks}>
      {children}
    </Layout>
  )
}
