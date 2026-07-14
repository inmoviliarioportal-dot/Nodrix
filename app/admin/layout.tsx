import { requireRolePage } from "@/lib/auth-guards"
import { Layout } from "@/components/Layout"

/**
 * Guard for the whole `/admin/*` tree: only `admin` and `gerencia` roles
 * may enter. Anyone else is redirected — see `requireRolePage`.
 *
 * Header centralizado acá (antes cada página de /admin/* repetía su propio
 * `<Layout navLinks={...}>`) para que sea un solo lugar donde agregar los
 * nuevos accesos de gestión (backoffice, asignación de asesores, creación
 * de usuarios) sin tener que tocar cada página.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireRolePage(["admin", "gerencia"])

  const navLinks = [
    { href: "/admin/dashboard", label: "KPIs" },
    { href: "/admin/reports", label: "Reportes" },
    { href: "/backoffice/queue", label: "Backoffice" },
    { href: "/backoffice/visits", label: "Visitas" },
    { href: "/admin/assignments", label: "Asignar asesor" },
    { href: "/admin/properties", label: "Propiedades" },
    { href: "/admin/users/new", label: "Crear usuario" },
    { href: "/admin/roles", label: "Roles" },
  ]

  return <Layout navLinks={navLinks}>{children}</Layout>
}
