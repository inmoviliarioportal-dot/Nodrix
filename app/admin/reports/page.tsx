import { requirePermissionPage } from "@/lib/auth-guards"
import ReportsClient from "./ReportsClient"

/**
 * Server wrapper: exige permiso de "ver" sobre Reportes antes de renderizar.
 * El layout de /admin solo valida el rol (admin/gerencia) y filtra el menú,
 * así que sin este guard la URL escrita a mano dejaba entrar igual.
 */
export default async function AdminReportsPage() {
  await requirePermissionPage("reportes", "view")
  return <ReportsClient />
}
