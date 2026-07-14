"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * Self-contained logout control: checks `GET /api/auth/user` on mount and
 * only renders once there's an active session, so it can be dropped into
 * `Layout` unconditionally (used on both authenticated and public pages
 * like /auth/login) without prop drilling auth state through every page.
 */
function LogoutButton({ className }: { className?: string }) {
  const router = useRouter()
  const [visible, setVisible] = React.useState(false)
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    fetch("/api/auth/user")
      .then((res) => {
        if (!cancelled) setVisible(res.ok)
      })
      .catch(() => {
        if (!cancelled) setVisible(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!visible) return null

  async function handleLogout() {
    setLoading(true)
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      router.push("/")
      router.refresh()
    } catch {
      toast.error("No se pudo cerrar la sesión. Intenta nuevamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={loading}
      onClick={handleLogout}
      className={cn(
        "gap-1.5 text-text-secondary hover:bg-status-error/10 hover:text-status-error",
        className
      )}
    >
      <LogOut className="size-3.5" aria-hidden="true" />
      {loading ? "Cerrando..." : "Cerrar sesión"}
    </Button>
  )
}

export { LogoutButton }
