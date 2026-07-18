import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { apiError, requireAuth, withErrorHandling, HTTP_STATUS } from "@/app/api/_shared";
import { MVP_ORG_ID } from "@/app/api/auth/_constants";
import { calculateScoring, loadActiveScoringConfig } from "@/lib/scoring";
import type { CustomerFinancialProfile } from "@/lib/scoring";
import { normalizeEmail, type AnySupabaseClient } from "@/lib/leads";
import { updateCustomerProfileFields } from "@/app/api/leads/route";

const VALID_EMPLOYMENT_TYPES = ["indefinido", "plazo_fijo", "honorarios", "independiente"];
const VALID_RELATIONSHIPS = ["conyuge", "padre", "madre", "hijo", "hermano"];

type Body = {
  employmentType?: string;
  employmentYears?: number;
  monthlySalary?: number;
  savingsAmount?: number;
  hasExistingDebt?: boolean;
  monthlyDebtPayments?: number;
  investmentType?: string;
  propertyStatus?: string;
  hasAval?: boolean;
  avalRelationship?: string;
  avalMonthlySalary?: number;
  avalEmploymentType?: string;
};

/**
 * POST /api/applications/[id]/update-financial-profile
 *
 * Permite al cliente actualizar su perfil financiero (y aval) mientras su
 * solicitud sigue en SCORING_COMPLETADO sin haber seleccionado propuesta
 * inicial -- recalcula el scoring con los nuevos datos para darle mejores
 * opciones (ej. si antes no calificaba para las UF mínimas). No cambia de
 * etapa: la solicitud se queda en SCORING_COMPLETADO para que el cliente
 * vuelva a ver su pre-evaluación en /onboarding/initial-proposal.
 */
export const POST = withErrorHandling(async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as Body | null;

  if (
    !body ||
    typeof body.monthlySalary !== "number" ||
    typeof body.savingsAmount !== "number" ||
    typeof body.employmentType !== "string" ||
    !VALID_EMPLOYMENT_TYPES.includes(body.employmentType) ||
    typeof body.employmentYears !== "number" ||
    typeof body.hasExistingDebt !== "boolean"
  ) {
    return apiError("Cuerpo de la solicitud inválido o incompleto.", HTTP_STATUS.BAD_REQUEST, "INVALID_BODY");
  }

  if (body.hasAval) {
    if (
      typeof body.avalRelationship !== "string" ||
      !VALID_RELATIONSHIPS.includes(body.avalRelationship) ||
      typeof body.avalMonthlySalary !== "number" ||
      typeof body.avalEmploymentType !== "string" ||
      !VALID_EMPLOYMENT_TYPES.includes(body.avalEmploymentType)
    ) {
      return apiError(
        "Faltan datos del aval (parentesco, renta o tipo de contrato).",
        HTTP_STATUS.BAD_REQUEST,
        "INVALID_AVAL_DATA"
      );
    }
  }

  const supabase = createSupabaseServiceRoleClient() as unknown as AnySupabaseClient;

  // 1. Verificar que la application pertenezca al usuario autenticado.
  const email = auth.user.email;
  if (!email) {
    return apiError("El usuario autenticado no tiene email.", HTTP_STATUS.BAD_REQUEST, "MISSING_USER_EMAIL");
  }

  const { data: customer } = await (supabase.from("customers") as any)
    .select("id")
    .eq("org_id", MVP_ORG_ID)
    .ilike("email", normalizeEmail(email))
    .maybeSingle();

  if (!customer) {
    return apiError("No se encontró tu perfil de cliente.", HTTP_STATUS.NOT_FOUND, "CUSTOMER_NOT_FOUND");
  }

  const { data: application } = await (supabase.from("applications") as any)
    .select("id, stage, customer_id")
    .eq("id", id)
    .eq("org_id", MVP_ORG_ID)
    .maybeSingle();

  if (!application || application.customer_id !== customer.id) {
    return apiError("Solicitud no encontrada.", HTTP_STATUS.NOT_FOUND, "APPLICATION_NOT_FOUND");
  }

  // 2. Solo editable mientras está en análisis de perfil, sin selección aún.
  if (application.stage !== "SCORING_COMPLETADO") {
    return apiError(
      "Solo puedes actualizar tus datos mientras tu solicitud está en Análisis de perfil.",
      HTTP_STATUS.BAD_REQUEST,
      "STAGE_NOT_EDITABLE"
    );
  }

  // 3. Recalcular scoring.
  const profile: CustomerFinancialProfile = {
    monthlySalary: body.monthlySalary,
    savingsAmount: body.savingsAmount,
    employmentType: body.employmentType as CustomerFinancialProfile["employmentType"],
    employmentYears: body.employmentYears,
    hasExistingDebt: body.hasExistingDebt,
    monthlyDebtPayments: typeof body.monthlyDebtPayments === "number" ? body.monthlyDebtPayments : 0,
  };
  const config = await loadActiveScoringConfig(MVP_ORG_ID, supabase as any);
  const result = calculateScoring(profile, config);

  // 4. Actualizar application: nuevo scoring + reset de selección previa.
  const { data: updatedApplication, error: updateError } = await (supabase.from("applications") as any)
    .update({
      scoring_category: result.category,
      scoring_score: result.score,
      savings_amount: profile.savingsAmount,
      initial_proposal_band: null,
      initial_proposal_purpose: null,
      initial_proposal_selected_at: null,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (updateError || !updatedApplication) {
    return apiError(
      `No se pudo actualizar tu solicitud: ${updateError?.message ?? "error desconocido"}`,
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }

  // 5. Persistir investment_type/property_status/monthly_income en customers.
  await updateCustomerProfileFields(supabase, customer.id, {
    investmentType: body.investmentType,
    propertyStatus: body.propertyStatus,
    monthlySalary: body.monthlySalary,
  });

  // 6. Upsert/borrado de aval.
  if (body.hasAval) {
    await (supabase.from("guarantors") as any)
      .upsert(
        {
          org_id: MVP_ORG_ID,
          application_id: id,
          relationship: body.avalRelationship,
          monthly_income: body.avalMonthlySalary,
          employment_type: body.avalEmploymentType,
        },
        { onConflict: "application_id" }
      );
  } else {
    await (supabase.from("guarantors") as any).delete().eq("application_id", id);
  }

  // 7. Traza de auditoría (mismo stage, solo para dejar registro del cambio).
  await supabase.from("application_stage_history").insert({
    application_id: id,
    from_stage: "SCORING_COMPLETADO",
    to_stage: "SCORING_COMPLETADO",
    actor_user_id: null,
    note: "Cliente actualizó sus datos financieros y se recalculó su scoring.",
  });

  const { data: updatedCustomer } = await (supabase.from("customers") as any)
    .select("*")
    .eq("id", customer.id)
    .maybeSingle();

  return NextResponse.json({ application: updatedApplication, customer: updatedCustomer });
});
