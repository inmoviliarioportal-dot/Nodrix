import {
  BarChart3Icon,
  FileBarChart2Icon,
  LayoutDashboardIcon,
  CalendarDaysIcon,
  UserPlusIcon,
  BuildingIcon,
  MapPinIcon,
  UsersIcon,
  ShieldIcon,
} from "lucide-react"

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
    { href: "/admin/dashboard", label: "KPIs", icon: BarChart3Icon },
    { href: "/admin/reports", label: "Reportes", icon: FileBarChart2Icon },
    { href: "/backoffice/queue", label: "Backoffice", icon: LayoutDashboardIcon },
    { href: "/backoffice/visits", label: "Visitas", icon: CalendarDaysIcon },
    { href: "/admin/assignments", label: "Asignar asesor", icon: UserPlusIcon },
    { href: "/admin/properties", label: "Propiedades", icon: BuildingIcon },
    { href: "/admin/regions", label: "Regiones", icon: MapPinIcon },
    { href: "/admin/users/new", label: "Crear usuario", icon: UsersIcon },
    { href: "/admin/roles", label: "Roles", icon: ShieldIcon },
  ]

  return <Layout navLinks={navLinks}>{children}</Layout>
}
