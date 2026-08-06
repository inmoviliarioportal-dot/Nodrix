import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase";
import {
  requireAuth,
  withErrorHandling,
  apiError,
  HTTP_STATUS,
  getUserRoleAndCustomRoleId,
} from "@/app/api/_shared";
import { getEffectivePermissions } from "@/lib/permissions";
import { loadApplicationDetail } from "@/lib/application-detail";
import type { AnySupabaseClient } from "@/lib/leads";
import { MVP_ORG_ID } from "../_constants";

/**
 * GET /api/auth/user
 *
 * Returns the currently authenticated user plus its associated `customers`
 * row. `customers` has no `user_id` column linking it to Supabase Auth (see
 * `database/schema.sql`), so the match is done by `(org_id, email)` — the
 * same email used at sign-up/sign-in.
 *
 * Cuando el usuario ES un cliente (tiene fila en `customers`) también se
 * devuelve su solicitud más reciente YA CON EL DETALLE COMPLETO
 * (`application`), el mismo objeto que retorna `GET /api/applications/[id]`.
 * Esto existe por rendimiento del panel del cliente: antes el dashboard
 * encadenaba tres requests (este -> `/api/applications?customer_id=` ->
 * `/api/applications/[id]`) y quedaba bloqueado en "Cargando" durante tres
 * round-trips. Los usuarios de staff (asesor/admin/gerencia) no tienen fila
 * en `customers`, así que para ellos no se ejecuta ninguna consulta extra.
 */
export const GET = withErrorHandling(async () => {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  const { user } = auth;
  const { role, customRoleId } = await getUserRoleAndCustomRoleId(user.id);
  const permissions = await getEffectivePermissions(role, customRoleId, user.id);

  const serviceRoleClient = createSupabaseServiceRoleClient() as any;
  const { data: customer, error: customerError } = await serviceRoleClient
    .from("customers")
    .select()
    .eq("org_id", MVP_ORG_ID)
    .eq("email", user.email)
    .maybeSingle();

  if (customerError) {
    return apiError(
      customerError.message,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "CUSTOMER_FETCH_FAILED"
    );
  }

  // Solo los clientes tienen solicitud asociada; el staff se salta esto.
  let application: Record<string, unknown> | null = null;
  if (customer?.id) {
    const { data: latest } = await serviceRoleClient
      .from("applications")
      .select("id")
      .eq("org_id", MVP_ORG_ID)
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latest?.id) {
      const detail = await loadApplicationDetail(
        serviceRoleClient as unknown as AnySupabaseClient,
        latest.id,
        MVP_ORG_ID
      );
      application = detail?.application ?? null;
    }
  }

  return NextResponse.json({ user, customer: customer ?? null, role, permissions, application });
});
