"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { User, Pencil, KeyRound, LogOut } from "lucide-react"
import { toast } from "sonner"

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { EditProfileDialog } from "@/components/dashboard/EditProfileDialog"
import { ChangePasswordDialog } from "@/components/dashboard/ChangePasswordDialog"

interface AuthUser {
  email?: string | null
  user_metadata?: { name?: string }
}

function initialsFrom(name: string | undefined, email: string | undefined) {
  const source = name?.trim() || email?.trim() || "?"
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return source.slice(0, 2).toUpperCase()
}

/**
 * Menú de cuenta con avatar/iniciales — reemplaza el botón suelto de
 * "Cerrar sesión" en Layout. Solo se renderiza si hay sesión activa (chequea
 * GET /api/auth/user al montar, igual que hacía LogoutButton).
 */
function AccountMenu() {
  const router = useRouter()
  const [user, setUser] = React.useState<AuthUser | null>(null)
  const [editOpen, setEditOpen] = React.useState(false)
  const [passwordOpen, setPasswordOpen] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    fetch("/api/auth/user")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setUser(data?.user ?? null)
      })
      .catch(() => {
        if (!cancelled) setUser(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!user) return null

  const name = user.user_metadata?.name
  const email = user.email ?? undefined

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      router.push("/")
      router.refresh()
    } catch {
      toast.error("No se pudo cerrar la sesión. Intenta nuevamente.")
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="glow-cyan flex size-8 items-center justify-center rounded-full border border-neon-cyan/40 bg-neon-cyan/10 text-xs font-semibold text-neon-cyan transition-transform duration-150 hover:scale-105"
          aria-label="Menú de cuenta"
        >
          {initialsFrom(name, email)}
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>
            <div className="flex items-center gap-2">
              <User className="size-3.5 shrink-0" aria-hidden="true" />
              <div className="flex min-w-0 flex-col">
                {name && <span className="truncate text-sm font-medium text-text-primary">{name}</span>}
                <span className="truncate text-xs text-text-tertiary">{email}</span>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" aria-hidden="true" />
            Editar mis datos
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setPasswordOpen(true)}>
            <KeyRound className="size-4" aria-hidden="true" />
            Cambiar contraseña
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={handleLogout}>
            <LogOut className="size-4" aria-hidden="true" />
            Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditProfileDialog open={editOpen} onOpenChange={setEditOpen} />
      <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
    </>
  )
}

export { AccountMenu }
