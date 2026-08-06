import { requirePermissionPage } from "@/lib/auth-guards"
import RegionsClient from "./RegionsClient"

/** Server wrapper: exige permiso de "ver" sobre Regiones y comunas. */
export default async function AdminRegionsPage() {
  await requirePermissionPage("regiones", "view")
  return <RegionsClient />
}
