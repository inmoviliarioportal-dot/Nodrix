import { requireRolePage } from "@/lib/auth-guards"
import { hasPermission } from "@/lib/permissions"
import { NAV_REGISTRY } from "@/lib/nav-registry"
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

  /** El menú se DERIVA de NAV_REGISTRY (lib/nav-registry.ts), la misma fuente
   * de la que sale la matriz de permisos -- así una vista nueva aparece en
   * ambos lugares con un solo cambio. Cada item se filtra por su propia clave
   * de permiso (`item.key`), una por vista. Un grupo entero desaparece si
   * ninguno de sus items quedó visible. */
  const navLinks: (LayoutNavLink | LayoutNavGroup)[] = NAV_REGISTRY.map((group) => ({
    label: group.label,
    iconKey: group.iconKey as LayoutNavGroup["iconKey"],
    items: group.items
      .filter((item) => isAdmin || hasPermission(permissions, item.key, "view"))
      .map(
        (item): LayoutNavLink => ({
          href: item.href,
          label: item.label,
          iconKey: item.iconKey as LayoutNavLink["iconKey"],
        })
      ),
  })).filter((group) => group.items.length > 0)

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
