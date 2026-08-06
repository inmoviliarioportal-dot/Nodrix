import { requireRolePage } from "@/lib/auth-guards"
import RolesClient from "./RolesClient"

/**
 * Server wrapper: admin-only FIJO, no por permiso configurable. Es la pantalla
 * donde se configuran los permisos de todos, así que autorizarla por permiso
 * permitiría a un rol personalizado auto-otorgarse cualquier otro permiso
 * (escalada de privilegios). Ver la nota en lib/nav-registry.ts.
 */
export default async function AdminRolesPage() {
  await requireRolePage(["admin"])
  return <RolesClient />
}
