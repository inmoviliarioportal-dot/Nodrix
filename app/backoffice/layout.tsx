import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase"
import { getUserRoleAndCustomRoleId } from "@/app/api/_shared"
import { getEffectivePermissions, hasPermission } from "@/lib/permissions"
import { Layout } from "@/components/Layout"

/**
 * Guard for the whole `/backoffice/*` tree: entra cualquier usuario que
 * tenga al menos permiso de "ver" en Bandeja o Visitas -- esto cubre a
 * asesor/admin/gerencia (permisos default) y también a un rol
 * personalizado creado en /admin/roles con acceso a solo uno de esos
 * módulos (ej. "solo reagendamiento"). Cada página bajo este árbol sigue
 * exigiendo su propio permiso específico contra la API.
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
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { role, customRoleId } = await getUserRoleAndCustomRoleId(user.id)
  if (role === "cliente") redirect("/dashboard")

  const permissions = await getEffectivePermissions(role, customRoleId)
  const canSeeQueue = hasPermission(permissions, "bandeja", "view")
  const canSeeVisits = hasPermission(permissions, "visitas", "view")
  if (!canSeeQueue && !canSeeVisits) redirect("/dashboard")

  const navLinks = [
    ...(canSeeQueue ? [{ href: "/backoffice/queue", label: "Bandeja" }] : []),
    ...(canSeeVisits ? [{ href: "/backoffice/visits", label: "Visitas" }] : []),
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
