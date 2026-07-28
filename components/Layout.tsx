"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bell, LayoutDashboard, FileText } from "lucide-react"

import { cn } from "@/lib/utils"
import { AccountMenu } from "@/components/AccountMenu"

export interface LayoutNavLink {
  href: string
  label: string
  icon?: React.ComponentType<{ className?: string }>
}

export interface LayoutProps extends React.ComponentProps<"div"> {
  /** Texto del logo/marca. Placeholder hasta definir branding final. */
  brand?: string
  /** Links de navegación del header. Por defecto: Panel + Documentos (portal cliente). */
  navLinks?: LayoutNavLink[]
}

const DEFAULT_NAV_LINKS: LayoutNavLink[] = [
  { href: "/dashboard", label: "Panel", icon: LayoutDashboard },
  { href: "/dashboard/documents", label: "Documentos", icon: FileText },
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

  return (
    <div
      className={cn("flex min-h-screen flex-col bg-background text-foreground", className)}
      {...props}
    >
      <header className="border-b border-border bg-surface/60 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-6">
          <div className="flex items-center gap-7">
            <Link
              href="/"
              className="text-base font-bold tracking-tight text-text-primary transition-colors duration-200 hover:text-gold"
            >
              {brand}
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              {navLinks.map((link) => {
                const isActive = pathname === link.href
                const Icon = link.icon
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "hidden items-center gap-1.5 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors duration-200 sm:flex",
                      isActive
                        ? "bg-neon-cyan/10 text-neon-cyan"
                        : "text-text-tertiary hover:text-text-primary"
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {Icon && <Icon className="size-4 shrink-0" aria-hidden="true" />}
                    {link.label}
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
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
    </div>
  )
}

export { Layout }
