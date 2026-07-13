import { redirect } from "next/navigation"

/**
 * La subida de documentos se maneja como modal dentro de `/dashboard`
 * (patrón más simple, evita duplicar el fetch de la application). Esta ruta
 * se mantiene como alias de conveniencia para enlaces directos a "Documentos".
 */
export default function DashboardDocumentsPage() {
  redirect("/dashboard")
}
