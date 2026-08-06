import { requirePermissionPage } from "@/lib/auth-guards"
import ManualClient from "./ManualClient"

/** Server wrapper: exige permiso de EDICIÓN sobre la Bandeja de leads.
 *
 * Esta pantalla es la herramienta manual heredada de Release 1: cambia el
 * `stage` de una solicitud y el estado de sus documentos DIRECTAMENTE,
 * saltándose la máquina de estados (lib/stage-machine.ts) y sus
 * validaciones. Por eso pide `edit` y no `view`: no es una pantalla de
 * consulta, es una palanca de override.
 *
 * Se eligió `bandeja` en vez de restringirla a admin para NO quitarle el
 * acceso a quien hoy lo tiene: agregar la barrera no debería cambiar quién
 * puede hacer su trabajo. Si más adelante quieres que sea exclusiva de
 * admin, cámbialo por `requireRolePage(["admin"])`.
 */
export default async function AdminManualPage() {
  await requirePermissionPage("bandeja", "edit")
  return <ManualClient />
}
