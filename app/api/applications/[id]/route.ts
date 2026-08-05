import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { apiError, requireAuth, withErrorHandling, HTTP_STATUS } from "@/app/api/_shared";
import { MVP_ORG_ID } from "@/app/api/auth/_constants";
import type { AnySupabaseClient } from "@/lib/leads";

/**
 * GET /api/applications/[id]
 *
 * Returns full detail for one application, including its customer and
 * stage history, for the fixed MVP org. Requires an authenticated session.
 */
export const GET = withErrorHandling(async (_request: Request, context: { params: Promise<{ id: string }> }) => {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  const { id } = await context.params;
  if (!id) {
    return apiError("Missing application id", HTTP_STATUS.BAD_REQUEST, "MISSING_ID");
  }

  const supabase = createSupabaseServiceRoleClient() as unknown as AnySupabaseClient;

  const { data: application, error: applicationError } = await supabase
    .from("applications")
    .select("*")
    .eq("id", id)
    .eq("org_id", MVP_ORG_ID)
    .maybeSingle();

  if (applicationError) {
    return apiError(`Failed to load application: ${applicationError.message}`, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
  if (!application) {
    return apiError("Application not found", HTTP_STATUS.NOT_FOUND, "APPLICATION_NOT_FOUND");
  }

  const applicationRow = application as {
    customer_id: string;
    assigned_advisor_id: string | null;
    wizard_variable_set_id: string | null;
  };

  const [{ data: customer }, { data: history }, { data: documents }, { data: advisor }, { data: variableSet }] =
    await Promise.all([
    supabase.from("customers").select("*").eq("id", applicationRow.customer_id).maybeSingle(),
    supabase
      .from("application_stage_history")
      .select("*")
      .eq("application_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("documents")
      .select("*")
      .eq("application_id", id)
      .order("created_at", { ascending: false }),
    // Nombre + teléfono del asesor asignado (si hay uno) -- se muestran en la
    // burbuja de WhatsApp del dashboard cliente para generar cercanía y
    // armar el enlace de contacto real. No se expone el email/id del asesor
    // al cliente, solo nombre y teléfono.
    applicationRow.assigned_advisor_id
      ? supabase.from("users").select("full_name, phone").eq("id", applicationRow.assigned_advisor_id).maybeSingle()
      : Promise.resolve({ data: null }),
    // Versión de wizard_variable_sets a la que quedó anclada esta solicitud
    // (ver lib/wizard-variables.ts) -- solo se usa para mostrarle al asesor
    // un dato discreto ("Parámetros vN") en el backoffice, no se expone el
    // contenido completo del set.
    applicationRow.wizard_variable_set_id
      ? supabase.from("wizard_variable_sets").select("version").eq("id", applicationRow.wizard_variable_set_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const advisorRow = advisor as { full_name: string | null; phone: string | null } | null;
  const variableSetRow = variableSet as { version: number } | null;

  return NextResponse.json({
    application: {
      ...application,
      documents: documents ?? [],
      assigned_advisor: advisorRow ? { full_name: advisorRow.full_name, phone: advisorRow.phone } : null,
      variable_set_version: variableSetRow?.version ?? null,
    },
    customer: customer ?? null,
    stageHistory: history ?? [],
  });
});
