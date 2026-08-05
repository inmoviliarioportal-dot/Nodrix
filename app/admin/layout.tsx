import { requireRolePage } from "@/lib/auth-guards"
import { hasPermission } from "@/lib/permissions"
import { Layout, type LayoutNavLink, type LayoutNavGroup } from "@/components/Layout"

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

  /** Cada item se filtra por su `module` de permiso, igual que antes -- lo
   * único que cambia es que ahora se agrupan bajo un único desplegable por
   * área en vez de aparecer todos como entradas planas en el header. Un
   * grupo entero desaparece si ninguno de sus items quedó visible. */
  type Item = LayoutNavLink & { module: Parameters<typeof hasPermission>[1] }

  function visible(items: Item[]): LayoutNavLink[] {
    return items.filter((item) => isAdmin || hasPermission(permissions, item.module, "view"))
  }

  const groupDefs: { label: string; iconKey: LayoutNavGroup["iconKey"]; items: Item[] }[] = [
    {
      label: "Dashboard",
      iconKey: "chart",
      items: [
        { href: "/admin/dashboard", label: "KPIs", iconKey: "chart", module: "reportes" },
        { href: "/admin/reports", label: "Reportes", iconKey: "report", module: "reportes" },
      ],
    },
    {
      label: "Asesor",
      iconKey: "dashboard",
      items: [
        { href: "/backoffice/queue", label: "Backoffice", iconKey: "dashboard", module: "bandeja" },
        { href: "/admin/assignments", label: "Asignar asesor", iconKey: "userPlus", module: "usuarios" },
        { href: "/backoffice/visits", label: "Visitas", iconKey: "calendar", module: "visitas" },
      ],
    },
    {
      label: "Propiedades",
      iconKey: "building",
      items: [
        { href: "/admin/properties", label: "Crear", iconKey: "building", module: "propiedades" },
        { href: "/admin/regions", label: "Regiones", iconKey: "mapPin", module: "propiedades" },
      ],
    },
    {
      label: "Usuarios",
      iconKey: "users",
      items: [{ href: "/admin/users", label: "Mantenedor", iconKey: "users", module: "usuarios" }],
    },
    {
      label: "Wizard",
      iconKey: "sliders",
      items: [{ href: "/admin/variables", label: "Variables", iconKey: "sliders", module: "variables" }],
    },
  ]

  const navLinks: (LayoutNavLink | LayoutNavGroup)[] = groupDefs
    .map((group) => ({ label: group.label, iconKey: group.iconKey, items: visible(group.items) }))
    .filter((group) => group.items.length > 0)

  // "Roles" se agrega directo al grupo "Usuarios" (sin `module`: siempre
  // admin-only, nunca configurable por permiso -- ver nota histórica abajo).
  if (isAdmin) {
    const usersGroup = navLinks.find(
      (entry): entry is LayoutNavGroup => "items" in entry && entry.label === "Usuarios"
    )
    const rolesLink: LayoutNavLink = { href: "/admin/roles", label: "Roles", iconKey: "shield" }
    if (usersGroup) {
      usersGroup.items.push(rolesLink)
    } else {
      navLinks.push({ label: "Usuarios", iconKey: "users", items: [rolesLink] })
    }
  }

  return <Layout navLinks={navLinks}>{children}</Layout>
}
