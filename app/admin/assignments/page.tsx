import { requirePermissionPage } from "@/lib/auth-guards"
import AssignmentsClient from "./AssignmentsClient"

/** Server wrapper: exige permiso de "ver" sobre Asignación de asesores. */
export default async function AdminAssignmentsPage() {
  await requirePermissionPage("asignaciones", "view")
  return <AssignmentsClient />
}
