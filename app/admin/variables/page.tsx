import { requirePermissionPage } from "@/lib/auth-guards"
import VariablesClient from "./VariablesClient"

/** Server wrapper: exige permiso de "ver" sobre Variables del wizard. */
export default async function AdminVariablesPage() {
  await requirePermissionPage("variables", "view")
  return <VariablesClient />
}
