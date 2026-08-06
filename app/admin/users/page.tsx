import { requirePermissionPage } from "@/lib/auth-guards"
import UsersClient from "./UsersClient"

/** Server wrapper: exige permiso de "ver" sobre el Mantenedor de usuarios. */
export default async function AdminUsersPage() {
  await requirePermissionPage("usuarios", "view")
  return <UsersClient />
}
