import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { apiError, requireRole, withErrorHandling, HTTP_STATUS } from "@/app/api/_shared";
import { MVP_ORG_ID } from "@/app/api/auth/_constants";

/** DELETE /api/applications/[id]/proposal-options/[optionId] — el asesor retira una opción aún no aceptada. */
export const DELETE = withErrorHandling(
  async (_request: Request, context: { params: Promise<{ id: string; optionId: string }> }) => {
    const auth = await requireRole(["asesor", "admin", "gerencia"]);
    if (!auth.authorized) return auth.response;

    const { id, optionId } = await context.params;
    const supabase = createSupabaseServiceRoleClient() as any;

    const { data: option } = await supabase
      .from("proposal_options")
      .select("status")
      .eq("id", optionId)
      .eq("application_id", id)
      .maybeSingle();

    if (!option) {
      return apiError("Opción no encontrada", HTTP_STATUS.NOT_FOUND, "OPTION_NOT_FOUND");
    }
    if (option.status === "aceptada") {
      return apiError("No puedes eliminar la opción que el cliente ya aceptó.", HTTP_STATUS.BAD_REQUEST, "OPTION_ACCEPTED");
    }

    const { error } = await supabase
      .from("proposal_options")
      .delete()
      .eq("id", optionId)
      .eq("application_id", id)
      .eq("org_id", MVP_ORG_ID);

    if (error) {
      return apiError(error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR, "OPTION_DELETE_FAILED");
    }

    return NextResponse.json({ ok: true });
  }
);
