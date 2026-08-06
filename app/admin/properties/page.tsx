import { requirePermissionPage } from "@/lib/auth-guards"
import PropertiesClient from "./PropertiesClient"

/** Server wrapper: exige permiso de "ver" sobre Propiedades. */
export default async function AdminPropertiesPage() {
  await requirePermissionPage("propiedades", "view")
  return <PropertiesClient />
}
