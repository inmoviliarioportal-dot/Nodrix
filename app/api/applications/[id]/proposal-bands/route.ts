import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { apiError, requireAuth, withErrorHandling, HTTP_STATUS } from "@/app/api/_shared";
import { MVP_ORG_ID } from "@/app/api/auth/_constants";
import { calculateProposalBands, type ProfessionalLevel } from "@/lib/proposal-risk";
import { calculateUFPreEvaluation } from "@/lib/uf-preevaluation";
import { evaluateIncomeSources, type IncomeSource } from "@/lib/income-types";
import type { AnySupabaseClient } from "@/lib/leads";

/**
 * GET /api/applications/[id]/proposal-bands
 *
 * Simulación de riesgo previa a la subida de documentos: calcula, a partir
 * del `scoring_score` ya obtenido, el nivel de seguridad (alta/media/baja)
 * para las 3 bandas de departamentos (1 / 2-4 / 5-6). Devuelve también el
 * `investment_type` registrado del cliente (inversion/vivienda_propia/ambos)
 * para que la UI resalte el lente correspondiente -- pero SIEMPRE se
 * calculan y devuelven ambos lentes (inversión y vivienda), incluso si el
 * cliente registró solo "vivienda_propia", según pidió el negocio.
 */
export const GET = withErrorHandling(async (_request: Request, context: { params: Promise<{ id: string }> }) => {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  const { id } = await context.params;
  const supabase = createSupabaseServiceRoleClient() as unknown as AnySupabaseClient;

  const { data: application } = await (supabase.from("applications") as any)
    .select(
      "id, stage, scoring_score, customer_id, savings_amount, total_debt_balance, income_sources, initial_proposal_band, initial_proposal_purpose"
    )
    .eq("id", id)
    .eq("org_id", MVP_ORG_ID)
    .maybeSingle();

  if (!application) {
    return apiError("Solicitud no encontrada", HTTP_STATUS.NOT_FOUND, "APPLICATION_NOT_FOUND");
  }

  const { data: customer } = await (supabase.from("customers") as any)
    .select("investment_type, monthly_income, professional_level")
    .eq("id", application.customer_id)
    .maybeSingle();

  // Si el cliente declaró un aval/codeudor en el wizard, su renta suma a la
  // capacidad de pago (ver lib/uf-preevaluation.ts) -- a lo más un aval por
  // application (ver migración 017_guarantors.sql).
  const { data: guarantor } = await (supabase.from("guarantors") as any)
    .select("monthly_income")
    .eq("application_id", id)
    .maybeSingle();

  // Tope cualitativo por nivel profesional (ver lib/proposal-risk.ts) --
  // default "tecnico" (el más conservador) si el cliente no lo declaró.
  const professionalLevel: ProfessionalLevel =
    customer?.professional_level === "profesional" ? "profesional" : "tecnico";
  const bands = calculateProposalBands(application.scoring_score ?? 0, professionalLevel);

  // La banda "1" es la de mayor probabilidad de aprobación (menor cantidad
  // de departamentos comprometidos) -- se usa como referencia conservadora
  // para el haircut de la pre-evaluación en UF.
  const mostLikelyBand = bands.find((b) => b.band === "1") ?? bands[0];

  // Si el cliente declaró ingreso mixto (wizard nuevo -- ver
  // lib/income-types.ts), el tope de Leverage puede ser más estricto que el
  // tramo general (ej. boleta/pensión/alquiler/sociedad topan en 6x, nunca
  // en 12x). `customer.monthly_income` ya viene con los haircuts aplicados
  // (se persiste así en updateCustomerProfileFields), así que acá solo se
  // necesita el tope de Leverage, no recalcular el ingreso.
  const incomeSources = Array.isArray(application.income_sources)
    ? (application.income_sources as IncomeSource[])
    : null;
  const maxLeverageMultipleOverride = incomeSources
    ? (evaluateIncomeSources(incomeSources).maxLeverageMultiple ?? undefined)
    : undefined;

  const ufPreEvaluation = calculateUFPreEvaluation({
    monthlySalaryCLP: customer?.monthly_income ?? 0,
    totalDebtBalanceCLP: application.total_debt_balance ?? 0,
    savingsAmountCLP: application.savings_amount ?? 0,
    approvalProbability: mostLikelyBand?.approvalProbability ?? 0,
    avalMonthlySalaryCLP: guarantor?.monthly_income ?? undefined,
    maxLeverageMultipleOverride,
  });

  return NextResponse.json({
    bands,
    ufPreEvaluation,
    registeredPurpose: customer?.investment_type ?? null,
    selection:
      application.initial_proposal_band && application.initial_proposal_purpose
        ? { band: application.initial_proposal_band, purpose: application.initial_proposal_purpose }
        : null,
  });
});
