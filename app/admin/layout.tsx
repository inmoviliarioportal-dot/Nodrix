import { requireRolePage } from "@/lib/auth-guards"
import { hasPermission } from "@/lib/permissions"
import { Layout } from "@/components/Layout"

/**
 * Guard for the whole `/admin/*` tree: only `admin` and `gerencia` roles
 * may enter. Anyone else is redirected — see `requireRolePage`.
 *
 * Header centralizado acá (antes cada página de /admin/* repetía su propio
 * `<Layout navLinks={...}>`) para que sea un solo lugar donde agregar los
 * nuevos accesos de gestión (backoffice, asignación de asesores, creación
 * de usuarios) sin tener que tocar cada página.
 *
 * `admin` siempre ve el menú completo (superusuario). `gerencia` solo ve
 * los links cuyo módulo tiene al menos `view` en sus permisos EFECTIVOS
 * (configurables por admin, ver /admin/roles y lib/permissions.ts) --
 * antes gerencia tenía EDIT_ALL hardcodeado y veía todo el menú sin poder
 * restringirse. "Roles" queda SIEMPRE oculto para gerencia sin excepción:
 * es donde se configuran los permisos de todos, incluidos los suyos, así
 * que dejarlo abierto sería una escalada de privilegios.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { role, permissions } = await requireRolePage(["admin", "gerencia"])
  const isAdmin = role === "admin"

  const allLinks = [
    { href: "/admin/dashboard", label: "KPIs", iconKey: "chart" as const, module: "reportes" as const },
    { href: "/admin/reports", label: "Reportes", iconKey: "report" as const, module: "reportes" as const },
    { href: "/backoffice/queue", label: "Backoffice", iconKey: "dashboard" as const, module: "bandeja" as const },
    { href: "/backoffice/visits", label: "Visitas", iconKey: "calendar" as const, module: "visitas" as const },
    { href: "/admin/assignments", label: "Asignar asesor", iconKey: "userPlus" as const, module: "usuarios" as const },
    { href: "/admin/properties", label: "Propiedades", iconKey: "building" as const, module: "propiedades" as const },
    { href: "/admin/regions", label: "Regiones", iconKey: "mapPin" as const, module: "propiedades" as const },
    { href: "/admin/users", label: "Usuarios", iconKey: "users" as const, module: "usuarios" as const },
    // "Roles" no lleva `module`: se filtra aparte, siempre admin-only.
  ]

  const navLinks = [
    ...allLinks.filter((link) => isAdmin || hasPermission(permissions, link.module, "view")),
    ...(isAdmin ? [{ href: "/admin/roles", label: "Roles", iconKey: "shield" as const }] : []),
  ]

  return <Layout navLinks={navLinks}>{children}</Layout>
}
