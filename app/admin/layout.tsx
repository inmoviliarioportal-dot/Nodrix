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
    { href: "/admin/dashboard", label: "KPIs", iconKey: "chart" as const },
    { href: "/admin/reports", label: "Reportes", iconKey: "report" as const },
    { href: "/backoffice/queue", label: "Backoffice", iconKey: "dashboard" as const },
    { href: "/backoffice/visits", label: "Visitas", iconKey: "calendar" as const },
    { href: "/admin/assignments", label: "Asignar asesor", iconKey: "userPlus" as const },
    { href: "/admin/properties", label: "Propiedades", iconKey: "building" as const },
    { href: "/admin/regions", label: "Regiones", iconKey: "mapPin" as const },
    { href: "/admin/users/new", label: "Crear usuario", iconKey: "users" as const },
    { href: "/admin/roles", label: "Roles", iconKey: "shield" as const },
  ]

  return <Layout navLinks={navLinks}>{children}</Layout>
}
