/**
 * Carga del DETALLE completo de una solicitud (application) -- fuente única
 * usada por `GET /api/applications/[id]` y por `GET /api/auth/user`.
 *
 * Existe para que el panel del cliente pueda resolverse en UNA sola llamada:
 * antes hacía tres requests en cascada (auth/user -> applications?customer_id
 * -> applications/[id]), lo que dejaba la pantalla bloqueada en "Cargando"
 * durante tres round-trips seguidos. Al devolver el detalle ya armado desde
 * `auth/user`, el dashboard renderiza tras un solo request.
 *
 * Todas las consultas dependientes van en un único `Promise.all` -- son
 * independientes entre sí, así que no tiene sentido encadenarlas.
 */

import type { AnySupabaseClient } from "@/lib/leads";

export interface ApplicationDetail {
  application: Record<string, unknown> | null;
  customer: Record<string, unknown> | null;
  stageHistory: Record<string, unknown>[];
  selectedProperties: {
    id: string;
    name: string;
    comuna: string | null;
    priceUf: number | null;
    image: string | null;
    destination: string | null;
    isHousing: boolean;
  }[];
}

/** Devuelve `null` si la solicitud no existe en la organización indicada. */
export async function loadApplicationDetail(
  supabase: AnySupabaseClient,
  applicationId: string,
  orgId: string
): Promise<ApplicationDetail | null> {
  const { data: application } = await supabase
    .from("applications")
    .select("*")
    .eq("id", applicationId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (!application) return null;

  const applicationRow = application as {
    customer_id: string;
    assigned_advisor_id: string | null;
    wizard_variable_set_id: string | null;
    selected_property_ids: string[] | null;
    accepted_housing_property_id: string | null;
    selected_property_destinations: Record<string, string> | null;
  };

  // Propiedades que el cliente eligió, para mostrárselas al ASESOR junto con
  // el destino/categoría bajo el que las eligió (ver migración 038).
  const selectedPropertyIds = Array.from(
    new Set(
      [...(applicationRow.selected_property_ids ?? []), applicationRow.accepted_housing_property_id].filter(
        (value): value is string => Boolean(value)
      )
    )
  );

  const [
    { data: customer },
    { data: history },
    { data: documents },
    { data: advisor },
    { data: variableSet },
    { data: selectedProperties },
  ] = await Promise.all([
    supabase.from("customers").select("*").eq("id", applicationRow.customer_id).maybeSingle(),
    supabase
      .from("application_stage_history")
      .select("*")
      .eq("application_id", applicationId)
      .order("created_at", { ascending: false }),
    supabase
      .from("documents")
      .select("*")
      .eq("application_id", applicationId)
      .order("created_at", { ascending: false }),
    // Nombre + teléfono del asesor asignado (si hay uno) -- se muestran en la
    // burbuja de WhatsApp del dashboard cliente. No se expone el email/id del
    // asesor al cliente, solo nombre y teléfono.
    applicationRow.assigned_advisor_id
      ? supabase.from("users").select("full_name, phone").eq("id", applicationRow.assigned_advisor_id).maybeSingle()
      : Promise.resolve({ data: null }),
    // Versión de wizard_variable_sets a la que quedó anclada esta solicitud
    // (ver lib/wizard-variables.ts) -- solo se muestra como dato discreto
    // ("Parámetros vN") en el backoffice.
    applicationRow.wizard_variable_set_id
      ? supabase
          .from("wizard_variable_sets")
          .select("version")
          .eq("id", applicationRow.wizard_variable_set_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    selectedPropertyIds.length > 0
      ? supabase.from("properties").select("id, name, comuna, price_uf, images").in("id", selectedPropertyIds)
      : Promise.resolve({ data: [] }),
  ]);

  const advisorRow = advisor as { full_name: string | null; phone: string | null } | null;
  const variableSetRow = variableSet as { version: number } | null;
  const destinations = applicationRow.selected_property_destinations ?? {};

  return {
    application: {
      ...(application as Record<string, unknown>),
      documents: documents ?? [],
      assigned_advisor: advisorRow ? { full_name: advisorRow.full_name, phone: advisorRow.phone } : null,
      variable_set_version: variableSetRow?.version ?? null,
    },
    customer: (customer as Record<string, unknown>) ?? null,
    stageHistory: (history as Record<string, unknown>[]) ?? [],
    // `destination` es null para solicitudes anteriores a la migración 038 y
    // para la propiedad de vivienda propia (que no pasa por carruseles).
    selectedProperties: ((selectedProperties ?? []) as Record<string, any>[]).map((p) => ({
      id: p.id,
      name: p.name,
      comuna: p.comuna ?? null,
      priceUf: p.price_uf ?? null,
      image: p.images?.[0] ?? null,
      destination: destinations[p.id] ?? null,
      isHousing: p.id === applicationRow.accepted_housing_property_id,
    })),
  };
}
