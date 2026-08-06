import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase"
import { getUserRoleAndCustomRoleId } from "@/app/api/_shared"
import { getEffectivePermissions, hasPermission } from "@/lib/permissions"
import { NAV_ITEMS } from "@/lib/nav-registry"
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

  const { role, customRoleId, active } = await getUserRoleAndCustomRoleId(user.id)
  if (!active) {
    await supabase.auth.signOut()
    redirect("/auth/login?disabled=1")
  }
  if (role === "cliente") redirect("/dashboard")

  const permissions = await getEffectivePermissions(role, customRoleId, user.id)
  const canSeeQueue = hasPermission(permissions, "bandeja", "view")
  const canSeeVisits = hasPermission(permissions, "visitas", "view")
  if (!canSeeQueue && !canSeeVisits) redirect("/dashboard")

  const navLinks = [
    ...(canSeeQueue ? [{ href: "/backoffice/queue", label: "Bandeja" }] : []),
    ...(canSeeVisits ? [{ href: "/backoffice/visits", label: "Visitas" }] : []),
    { href: "/backoffice/properties", label: "Propiedades" },
    // "Panel Admin" solo aparece si el rol realmente puede entrar a algo
    // ahí -- admin siempre; gerencia solo si tiene al menos un módulo
    // habilitado, para no ofrecer un atajo a un menú vacío.
    //
    // Antes esto enumeraba a mano reportes/usuarios/propiedades. Con el split
    // "una vista = un permiso" esa lista quedaría incompleta: un gerencia con
    // solo `kpis`, `asignaciones` o `regiones` vería el menú de /admin poblado
    // pero no el atajo. Ahora se deriva de NAV_ITEMS, exactamente la misma
    // fuente que filtra el menú en app/admin/layout.tsx, así que los dos no
    // se pueden volver a desincronizar.
    ...(role === "admin" ||
    (role === "gerencia" && NAV_ITEMS.some((item) => hasPermission(permissions, item.key, "view")))
      ? [{ href: "/admin/dashboard", label: "Panel Admin" }]
      : []),
  ]

  return (
    <Layout className="bg-deep-ambient" navLinks={navLinks}>
      {children}
    </Layout>
  )
}
