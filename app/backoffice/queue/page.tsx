import { requirePermissionPage } from "@/lib/auth-guards"
import { QueueClient } from "@/components/backoffice/QueueClient"

/**
 * Server wrapper: exige permiso de "ver" en Bandeja antes de renderizar el
 * cliente. Necesario porque el guard del layout (`BackofficeLayout`) solo
 * exige *algún* permiso de backoffice (bandeja o visitas) para poder
 * mostrar la nav -- un rol personalizado con solo "Visitas" no debe poder
 * entrar a esta página escribiendo la URL a mano.
 */
export default async function BackofficeQueuePage() {
  await requirePermissionPage("bandeja", "view")
  return <QueueClient />
}
