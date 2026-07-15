import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { apiError, requireAuth, requireRole, withErrorHandling, HTTP_STATUS } from "@/app/api/_shared";
import { MVP_ORG_ID } from "@/app/api/auth/_constants";
import type { AnySupabaseClient } from "@/lib/leads";

const MAX_OPTIONS_PER_APPLICATION = 6;
const VALID_PURPOSES = ["inversion", "vivienda_propia"] as const;

/**
 * GET /api/applications/[id]/proposal-options
 *
 * Lista las opciones de propuesta final cargadas por el asesor para esta
 * application. Accesible tanto para el cliente dueño (para ver/aceptar) como
 * para staff -- no se restringe por rol, solo por sesión, igual que
 * GET /api/applications/[id].
 */
export const GET = withErrorHandling(async (_request: Request, context: { params: Promise<{ id: string }> }) => {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  const { id } = await context.params;
  const supabase = createSupabaseServiceRoleClient() as unknown as AnySupabaseClient;

  const { data, error } = await (supabase.from("proposal_options") as any)
    .select("*")
    .eq("application_id", id)
    .eq("org_id", MVP_ORG_ID)
    .order("department_count", { ascending: true });

  if (error) {
    return apiError(error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR, "PROPOSAL_OPTIONS_FETCH_FAILED");
  }

  return NextResponse.json({ options: data ?? [] });
});

type Body = {
  departmentCount?: number;
  purpose?: string;
  comuna?: string;
  priceUf?: number;
  notes?: string;
};

/**
 * POST /api/applications/[id]/proposal-options
 *
 * El asesor/admin/gerencia carga una opción de propuesta final (hasta 6 por
 * application). Solo tiene sentido una vez que la solicitud llegó a
 * ENVIADO_A_BANCO (visita realizada + enviado a evaluación bancaria) -- ver
 * STAGE_TRANSITIONS en lib/stage-machine.ts, esa transición dejó de ser
 * automática justamente para esperar que el cliente acepte una de estas
 * opciones antes de avanzar a escrituración.
 */
export const POST = withErrorHandling(async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const auth = await requireRole(["asesor", "admin", "gerencia"]);
  if (!auth.authorized) return auth.response;

  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as Body | null;

  if (!body?.departmentCount || body.departmentCount < 1 || body.departmentCount > 6) {
    return apiError("departmentCount debe estar entre 1 y 6", HTTP_STATUS.BAD_REQUEST, "INVALID_DEPARTMENT_COUNT");
  }
  if (body.purpose && !VALID_PURPOSES.includes(body.purpose as (typeof VALID_PURPOSES)[number])) {
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

  const STAGES_ALLOWING_FINAL_PROPOSAL = ["ENVIADO_A_BANCO", "ESCRITURACION_AGENDADA", "CIERRE"];
  if (!STAGES_ALLOWING_FINAL_PROPOSAL.includes(application.stage)) {
    return apiError(
      "La propuesta final solo puede cargarse después de enviar la solicitud a evaluación bancaria.",
      HTTP_STATUS.BAD_REQUEST,
      "INVALID_STAGE"
    );
  }

  const { count } = await (supabase.from("proposal_options") as any)
    .select("id", { count: "exact", head: true })
    .eq("application_id", id);

  if ((count ?? 0) >= MAX_OPTIONS_PER_APPLICATION) {
    return apiError(
      `Ya se cargaron el máximo de ${MAX_OPTIONS_PER_APPLICATION} opciones para esta solicitud.`,
      HTTP_STATUS.BAD_REQUEST,
      "MAX_OPTIONS_REACHED"
    );
  }

  const { data: option, error } = await (supabase.from("proposal_options") as any)
    .insert({
      org_id: MVP_ORG_ID,
      application_id: id,
      department_count: body.departmentCount,
      purpose: body.purpose ?? null,
      comuna: body.comuna?.trim() || null,
      price_uf: body.priceUf ?? null,
      notes: body.notes?.trim() || null,
    })
    .select("*")
    .single();

  if (error || !option) {
    return apiError(
      `No se pudo crear la opción: ${error?.message ?? "error desconocido"}`,
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }

  return NextResponse.json({ option }, { status: 201 });
});
