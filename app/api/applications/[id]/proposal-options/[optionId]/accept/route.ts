import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { apiError, requireAuth, withErrorHandling, HTTP_STATUS } from "@/app/api/_shared";
import { MVP_ORG_ID } from "@/app/api/auth/_constants";

/**
 * POST /api/applications/[id]/proposal-options/[optionId]/accept
 *
 * El cliente acepta una de las opciones de propuesta final que cargó el
 * asesor. Marca esta opción 'aceptada', el resto 'rechazada', y guarda
 * `applications.accepted_proposal_option_id` -- este es el paso previo a la
 * aceptación final antes de escriturar: el asesor recién ahí puede avanzar
 * manualmente la solicitud a ESCRITURACION_AGENDADA (PATCH .../stage).
 */
export const POST = withErrorHandling(
  async (_request: Request, context: { params: Promise<{ id: string; optionId: string }> }) => {
    const auth = await requireAuth();
    if (!auth.authorized) return auth.response;

    const { id, optionId } = await context.params;
    const supabase = createSupabaseServiceRoleClient() as any;

    const { data: option } = await supabase
      .from("proposal_options")
      .select("id, status")
      .eq("id", optionId)
      .eq("application_id", id)
      .eq("org_id", MVP_ORG_ID)
      .maybeSingle();

    if (!option) {
      return apiError("Opción no encontrada", HTTP_STATUS.NOT_FOUND, "OPTION_NOT_FOUND");
    }

    const { data: siblings } = await supabase
      .from("proposal_options")
      .select("id")
      .eq("application_id", id)
      .neq("id", optionId);

    if (siblings?.length) {
      await supabase
        .from("proposal_options")
        .update({ status: "rechazada" })
        .in(
          "id",
          siblings.map((s: { id: string }) => s.id)
        );
    }

    const { data: updatedOption, error: optionError } = await supabase
      .from("proposal_options")
      .update({ status: "aceptada" })
      .eq("id", optionId)
      .select("*")
      .single();

    if (optionError || !updatedOption) {
      return apiError(
        `No se pudo aceptar la opción: ${optionError?.message ?? "error desconocido"}`,
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }

    await supabase
      .from("applications")
      .update({ accepted_proposal_option_id: optionId })
      .eq("id", id)
      .eq("org_id", MVP_ORG_ID);

    return NextResponse.json({ option: updatedOption });
  }
);
