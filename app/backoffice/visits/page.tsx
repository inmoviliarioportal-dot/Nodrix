import { requirePermissionPage } from "@/lib/auth-guards"
import { VisitsClient } from "@/components/backoffice/VisitsClient"

/**
 * Server wrapper: exige permiso de "ver" en Visitas -- ver comentario en
 * `app/backoffice/queue/page.tsx` sobre por qué el guard del layout no
 * alcanza para páginas individuales.
 */
export default async function VisitsPage() {
  await requirePermissionPage("visitas", "view")
  return <VisitsClient />
}
