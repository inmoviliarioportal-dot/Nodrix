import { requirePermissionPage } from "@/lib/auth-guards"
import NewUserClient from "./NewUserClient"

/** Server wrapper: exige permiso de "ver" sobre el Mantenedor de usuarios,
 * la misma clave que /admin/users. Sin esto la página de creación quedaba
 * accesible escribiendo la URL a mano aunque el usuario no tuviera permiso
 * sobre Usuarios -- el formulario se renderizaba igual y solo fallaba al
 * enviar (la API sí valida rol). Quién puede crear qué rol lo sigue
 * decidiendo POST /api/admin/users (gerencia solo crea asesores). */
export default async function AdminNewUserPage() {
  await requirePermissionPage("usuarios", "view")
  return <NewUserClient />
}
