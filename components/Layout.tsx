import Link from "next/link"

import { cn } from "@/lib/utils"

export interface LayoutProps extends React.ComponentProps<"div"> {
  /** Texto del logo/marca. Placeholder hasta definir branding final. */
  brand?: string
}

/**
 * Layout base compartido: header con logo placeholder y navegación simple,
 * dark theme premium aplicado globalmente via app/globals.css.
 */
function Layout({ brand = "Nodrix", className, children, ...props }: LayoutProps) {
  return (
    <div
      className={cn("flex min-h-screen flex-col bg-background text-foreground", className)}
      {...props}
    >
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight text-text-primary transition-colors duration-200 hover:text-gold"
          >
            {brand}
          </Link>
          <nav className="flex items-center gap-6 text-sm text-text-secondary">
            <Link href="/dashboard" className="transition-colors duration-200 hover:text-text-primary">
              Dashboard
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
    </div>
  )
}

export { Layout }
