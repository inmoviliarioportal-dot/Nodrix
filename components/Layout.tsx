"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Bell,
  LayoutDashboard,
  FileText,
  Menu,
  BarChart3,
  FileBarChart2,
  CalendarDays,
  UserPlus,
  Building2,
  MapPin,
  Users,
  Shield,
  SlidersHorizontal,
  ChevronDown,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { AccountMenu } from "@/components/AccountMenu"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"

/** Íconos de lucide-react son funciones -- no pueden pasarse como prop
 * directamente de un Server Component a este Client Component (React las
 * rechaza al serializar el límite RSC: "Functions cannot be passed
 * directly to Client Components"). Por eso `navLinks` recibe una CLAVE de
 * string (`iconKey`) resuelta acá adentro, nunca el componente en sí. */
const ICON_MAP: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  documents: FileText,
  chart: BarChart3,
  report: FileBarChart2,
  calendar: CalendarDays,
  userPlus: UserPlus,
  building: Building2,
  mapPin: MapPin,
  users: Users,
  shield: Shield,
  sliders: SlidersHorizontal,
}

export interface LayoutNavLink {
  href: string
  label: string
  iconKey?: keyof typeof ICON_MAP
}

/** Grupo de links que se muestra como un único ítem desplegable en el header
 * (ej. "Usuarios" agrupando Mantenedor + Roles) en vez de una entrada plana
 * por link. Un `navLinks` puede mezclar links sueltos y grupos. */
export interface LayoutNavGroup {
  label: string
  iconKey?: keyof typeof ICON_MAP
  items: LayoutNavLink[]
}

function isNavGroup(entry: LayoutNavLink | LayoutNavGroup): entry is LayoutNavGroup {
  return "items" in entry
}

export interface LayoutProps extends React.ComponentProps<"div"> {
  /** Texto del logo/marca. Placeholder hasta definir branding final. */
  brand?: string
  /** Links de navegación del header -- acepta links sueltos y/o grupos
   * desplegables (`LayoutNavGroup`). Por defecto: Panel + Documentos
   * (portal cliente). */
  navLinks?: (LayoutNavLink | LayoutNavGroup)[]
}

const DEFAULT_NAV_LINKS: LayoutNavLink[] = [
  { href: "/dashboard", label: "Panel", iconKey: "dashboard" },
  { href: "/dashboard/documents", label: "Documentos", iconKey: "documents" },
]

/**
 * Layout base compartido: header compacto (logo + 2-3 links con icono +
 * campanita de notificaciones + avatar de cuenta) y dark theme premium
 * aplicado globalmente via app/globals.css. El "Perfil" del cliente se
 * gestiona desde el menú del avatar (`AccountMenu`) en vez de una ruta
 * dedicada, ya que hoy no existe una página `/dashboard/profile`.
 */
function Layout({
  brand = "Nodrix",
  navLinks = DEFAULT_NAV_LINKS,
  className,
  children,
  ...props
}: LayoutProps) {
  const pathname = usePathname()
  const [logoHref, setLogoHref] = React.useState("/")

  React.useEffect(() => {
    let cancelled = false
    fetch("/api/auth/user")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.user) setLogoHref("/dashboard")
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div
      className={cn("flex min-h-screen flex-col bg-background text-foreground", className)}
      {...props}
    >
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-6">
          <div className="flex items-center gap-7">
            <Link
              href={logoHref}
              className="flex items-center gap-2 font-heading text-base font-semibold tracking-tight text-text-primary transition-colors duration-200 hover:text-gold"
            >
              <svg width="26" height="26" viewBox="0 0 34 34" aria-hidden="true">
                <rect width="34" height="34" rx="9" fill="var(--text-primary)" />
                <path
                  d="M9 19l6-6 4 3 6-7"
                  stroke="var(--gold)"
                  strokeWidth="2.3"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path d="M9 23.5h16" stroke="var(--gold)" strokeWidth="2.3" strokeLinecap="round" />
              </svg>
              {brand}
            </Link>
            <nav className="hidden items-center gap-5 text-sm sm:flex">
              {navLinks.map((entry) => {
                if (isNavGroup(entry)) {
                  const isGroupActive = entry.items.some((item) => pathname === item.href)
                  const GroupIcon = entry.iconKey ? ICON_MAP[entry.iconKey] : undefined
                  return (
                    <DropdownMenu key={entry.label}>
                      <DropdownMenuTrigger
                        className={cn(
                          "flex items-center gap-1.5 border-b-2 px-1 py-2 text-[13.5px] font-medium transition-colors duration-200",
                          isGroupActive
                            ? "border-neon-cyan text-neon-cyan"
                            : "border-transparent text-text-tertiary hover:text-text-primary"
                        )}
                      >
                        {GroupIcon && <GroupIcon className="size-4 shrink-0" aria-hidden="true" />}
                        {entry.label}
                        <ChevronDown className="size-3.5 shrink-0" aria-hidden="true" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        {entry.items.map((item) => {
                          const isActive = pathname === item.href
                          const Icon = item.iconKey ? ICON_MAP[item.iconKey] : undefined
                          return (
                            <DropdownMenuItem
                              key={item.href}
                              render={<Link href={item.href} aria-current={isActive ? "page" : undefined} />}
                              className={cn(isActive && "text-neon-cyan")}
                            >
                              {Icon && <Icon className="size-4 shrink-0" aria-hidden="true" />}
                              {item.label}
                            </DropdownMenuItem>
                          )
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )
                }

                const isActive = pathname === entry.href
                const Icon = entry.iconKey ? ICON_MAP[entry.iconKey] : undefined
                return (
                  <Link
                    key={entry.href}
                    href={entry.href}
                    className={cn(
                      "flex items-center gap-1.5 border-b-2 px-1 py-2 text-[13.5px] font-medium transition-colors duration-200",
                      isActive
                        ? "border-neon-cyan text-neon-cyan"
                        : "border-transparent text-text-tertiary hover:text-text-primary"
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {Icon && <Icon className="size-4 shrink-0" aria-hidden="true" />}
                    {entry.label}
                  </Link>
                )
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              className="flex size-9 items-center justify-center rounded-full text-text-tertiary transition-colors duration-200 hover:text-text-primary"
              aria-label="Notificaciones (próximamente)"
              title="Notificaciones (próximamente)"
            >
              <Bell className="size-4" aria-hidden="true" />
            </button>
            <AccountMenu />
            <DropdownMenu>
              <DropdownMenuTrigger
                className="flex size-9 items-center justify-center rounded-full text-text-tertiary transition-colors duration-200 hover:text-text-primary sm:hidden"
                aria-label="Abrir menú de navegación"
              >
                <Menu className="size-5" aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {navLinks.flatMap((entry) => {
                  if (isNavGroup(entry)) {
                    const GroupIcon = entry.iconKey ? ICON_MAP[entry.iconKey] : undefined
                    return [
                      <div
                        key={`${entry.label}-heading`}
                        className="flex items-center gap-1.5 px-2 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary"
                      >
                        {GroupIcon && <GroupIcon className="size-3.5 shrink-0" aria-hidden="true" />}
                        {entry.label}
                      </div>,
                      ...entry.items.map((item) => {
                        const isActive = pathname === item.href
                        const Icon = item.iconKey ? ICON_MAP[item.iconKey] : undefined
                        return (
                          <DropdownMenuItem
                            key={item.href}
                            render={<Link href={item.href} aria-current={isActive ? "page" : undefined} />}
                            className={cn("pl-5", isActive && "text-neon-cyan")}
                          >
                            {Icon && <Icon className="size-4 shrink-0" aria-hidden="true" />}
                            {item.label}
                          </DropdownMenuItem>
                        )
                      }),
                    ]
                  }

                  const isActive = pathname === entry.href
                  const Icon = entry.iconKey ? ICON_MAP[entry.iconKey] : undefined
                  return [
                    <DropdownMenuItem
                      key={entry.href}
                      render={<Link href={entry.href} aria-current={isActive ? "page" : undefined} />}
                      className={cn(isActive && "text-neon-cyan")}
                    >
                      {Icon && <Icon className="size-4 shrink-0" aria-hidden="true" />}
                      {entry.label}
                    </DropdownMenuItem>,
                  ]
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
    </div>
  )
}

export { Layout }
