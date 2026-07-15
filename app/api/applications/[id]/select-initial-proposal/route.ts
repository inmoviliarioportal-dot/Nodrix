import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { apiError, requireAuth, withErrorHandling, HTTP_STATUS } from "@/app/api/_shared";
import { MVP_ORG_ID } from "@/app/api/auth/_constants";
import { advanceAfterInitialProposalSelection } from "@/lib/stage-machine";
import type { AnySupabaseClient } from "@/lib/leads";

const VALID_BANDS = ["1", "2-4", "5-6"] as const;
const VALID_PURPOSES = ["inversion", "vivienda_propia"] as const;

type Body = {
  band?: string;
  purpose?: string;
};

/**
 * POST /api/applications/[id]/select-initial-proposal
 *
 * El cliente elige una banda de departamentos (1 / 2-4 / 5-6) y el lente
 * con el que la evaluó (inversión o vivienda propia) ANTES de subir
 * documentos -- es una simulación, no una aprobación. Solo válido mientras
 * la application esté en SCORING_COMPLETADO (ver STAGE_TRANSITIONS, esa
 * transición dejó de ser automática justamente para esperar esta elección).
 * Al guardar la selección, avanza la solicitud a DOCUMENTOS_PENDIENTES.
 */
export const POST = withErrorHandling(async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as Body | null;

  if (!body?.band || !VALID_BANDS.includes(body.band as (typeof VALID_BANDS)[number])) {
    return apiError(`band inválida. Valores permitidos: ${VALID_BANDS.join(", ")}`, HTTP_STATUS.BAD_REQUEST, "INVALID_BAND");
  }
  if (!body?.purpose || !VALID_PURPOSES.includes(body.purpose as (typeof VALID_PURPOSES)[number])) {
    return apiError(
      `purpose inválido. Valores permitidos: ${VALID_PURPOSES.join(", ")}`,
      HTTP_STATUS.BAD_REQUEST,
      "INVALID_PURPOSE"
    );
  }

  const supabase = createSupabaseServiceRoleClient() as unknown as AnySupabaseClient;

  const { data: application } = await (supabase.from("applications") as any)
    .select("id, stage")
    .eq("id", id)
    .eq("org_id", MVP_ORG_ID)
    .maybeSingle();

  if (!application) {
    return apiError("Solicitud no encontrada", HTTP_STATUS.NOT_FOUND, "APPLICATION_NOT_FOUND");
  }
  if (application.stage !== "SCORING_COMPLETADO") {
    return apiError(
      "Solo puedes elegir tu propuesta inicial cuando tu solicitud está recién evaluada (antes de subir documentos).",
      HTTP_STATUS.BAD_REQUEST,
      "INVALID_STAGE"
    );
  }

  const { data: updated, error } = await (supabase.from("applications") as any)
    .update({
      initial_proposal_band: body.band,
      initial_proposal_purpose: body.purpose,
      initial_proposal_selected_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error || !updated) {
    return apiError(
      `No se pudo guardar tu selección: ${error?.message ?? "error desconocido"}`,
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }

  await advanceAfterInitialProposalSelection(supabase, id);

  const { data: finalApplication } = await (supabase.from("applications") as any)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  return NextResponse.json({ application: finalApplication ?? updated });
});
