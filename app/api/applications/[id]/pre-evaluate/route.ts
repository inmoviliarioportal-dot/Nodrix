import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { apiError, requireAuth, withErrorHandling, HTTP_STATUS } from "@/app/api/_shared";
import { MVP_ORG_ID } from "@/app/api/auth/_constants";
import type { AnySupabaseClient, ApplicationRow } from "@/lib/leads";

/**
 * POST /api/applications/[id]/pre-evaluate
 *
 * Body (all optional): `{ recalculate?: boolean, salary?: number, savings?: number }`.
 *
 * ⚠️ MOCK / ILUSTRATIVO HASTA RELEASE 3 ⚠️
 * ---------------------------------------------------------------------------
 * Este endpoint es un **simulador hipotecario mock**, NO una pre-aprobación
 * bancaria real. No hay integración bancaria disponible en el MVP (regla de
 * negocio del proyecto). Los rangos UF devueltos son puramente ilustrativos
 * para dar una referencia rápida al asesor/cliente; la evaluación crediticia
 * real ocurre en etapas posteriores (ENVIADO_A_BANCO) fuera de este cálculo.
 *
 * NOTA DE SCHEMA: `applications`/`customers` (database/schema.sql) todavía no
 * tienen columnas `salary`/`savings` — ese dato de perfil financiero vive hoy
 * únicamente en el flujo del Wizard de Onboarding (fuera del scope de este
 * agente: DB schema no se toca aquí). Por eso `salary`/`savings` se aceptan
 * como parte del body de esta llamada (enviados por quien dispara el
 * recálculo, ej. el backoffice del asesor) en vez de leerse de la fila de
 * `applications`. Si no se envían, se usan defaults conservadores para que
 * el endpoint siga siendo determinístico y nunca falle por falta de datos.
 *
 * Fórmulas (deterministas, mismo input = mismo output):
 *   minUF = clamp((salary * 20) / 4000, 2500, 8000)
 *   maxUF = clamp((salary * 35) / 4000 + (savings / 50000), 2500, 8000)
 *   confidence = min(0.95, 0.70 + (score / 100) * 0.25)   // score = applications.scoring_score (0-100)
 *
 * Efectos:
 *   - UPDATE applications SET pre_evaluation_min_uf, pre_evaluation_max_uf
 *   - INSERT audit_events (entity_type='application', action='pre_evaluate')
 *
 * Requiere sesión autenticada.
 */

const MIN_UF = 2500;
const MAX_UF = 8000;

/** Default conservador si el caller no envía salary/savings (ver nota arriba). */
const DEFAULT_SALARY = 700_000; // CLP
const DEFAULT_SAVINGS = 3_000_000; // CLP

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export const POST = withErrorHandling(async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  const { id } = await context.params;
  if (!id) {
    return apiError("Missing application id", HTTP_STATUS.BAD_REQUEST, "MISSING_ID");
  }

  const body = (await request.json().catch(() => null)) as
    | { recalculate?: boolean; salary?: number; savings?: number }
    | null;

  const salary =
    body && typeof body.salary === "number" && Number.isFinite(body.salary) && body.salary >= 0
      ? body.salary
      : DEFAULT_SALARY;
  const savings =
    body && typeof body.savings === "number" && Number.isFinite(body.savings) && body.savings >= 0
      ? body.savings
      : DEFAULT_SAVINGS;

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

  const applicationRow = application as ApplicationRow;
  const score = applicationRow.scoring_score ?? 0;

  // --- Cálculo mock determinístico (ver docs arriba) ---
  const minUFRaw = (salary * 20) / 4000;
  const maxUFRaw = (salary * 35) / 4000 + savings / 50000;

  const minUF = round2(clamp(minUFRaw, MIN_UF, MAX_UF));
  const maxUF = round2(clamp(Math.max(maxUFRaw, minUFRaw), MIN_UF, MAX_UF));
  const confidence = round2(Math.min(0.95, 0.7 + (score / 100) * 0.25));

  const { data: updated, error: updateError } = await supabase
    .from("applications")
    .update({
      pre_evaluation_min_uf: minUF,
      pre_evaluation_max_uf: maxUF,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (updateError || !updated) {
    return apiError(
      `Failed to update pre-evaluation: ${updateError?.message ?? "unknown error"}`,
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }

  const { error: auditError } = await supabase.from("audit_events").insert({
    org_id: MVP_ORG_ID,
    entity_type: "application",
    entity_id: id,
    action: "pre_evaluate",
    actor_user_id: auth.user.id,
    before: {
      pre_evaluation_min_uf: applicationRow.pre_evaluation_min_uf,
      pre_evaluation_max_uf: applicationRow.pre_evaluation_max_uf,
    },
    after: { pre_evaluation_min_uf: minUF, pre_evaluation_max_uf: maxUF, confidence },
  });

  if (auditError) {
    return apiError(
      `Pre-evaluation updated but failed to record audit log: ${auditError.message}`,
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }

  return NextResponse.json({
    application: updated,
    preEvaluation: { minUF, maxUF, confidence },
  });
});
