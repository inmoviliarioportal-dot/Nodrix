import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { apiError, requireAuth, withErrorHandling, HTTP_STATUS } from "@/app/api/_shared";
import { MVP_ORG_ID } from "@/app/api/auth/_constants";
import { calculateProposalBands } from "@/lib/proposal-risk";
import { calculateUFPreEvaluation } from "@/lib/uf-preevaluation";
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
    .select("id, stage, scoring_score, customer_id, savings_amount, initial_proposal_band, initial_proposal_purpose")
    .eq("id", id)
    .eq("org_id", MVP_ORG_ID)
    .maybeSingle();

  if (!application) {
    return apiError("Solicitud no encontrada", HTTP_STATUS.NOT_FOUND, "APPLICATION_NOT_FOUND");
  }

  const { data: customer } = await (supabase.from("customers") as any)
    .select("investment_type, monthly_income")
    .eq("id", application.customer_id)
    .maybeSingle();

  // Si el cliente declaró un aval/codeudor en el wizard, su renta suma a la
  // capacidad de pago (ver lib/uf-preevaluation.ts) -- a lo más un aval por
  // application (ver migración 017_guarantors.sql).
  const { data: guarantor } = await (supabase.from("guarantors") as any)
    .select("monthly_income")
    .eq("application_id", id)
    .maybeSingle();

  const bands = calculateProposalBands(application.scoring_score ?? 0);

  // La banda "1" es la de mayor probabilidad de aprobación (menor cantidad
  // de departamentos comprometidos) -- se usa como referencia conservadora
  // para el haircut de la pre-evaluación en UF.
  const mostLikelyBand = bands.find((b) => b.band === "1") ?? bands[0];
  // NOTA: `monthly_debt_payments` no se persiste hoy en ninguna tabla (solo
  // se usa en memoria al calcular el scoring inicial) -- se asume 0 acá.
  // Si en el futuro se persiste, reemplazar este valor fijo.
  const ufPreEvaluation = calculateUFPreEvaluation({
    monthlySalaryCLP: customer?.monthly_income ?? 0,
    monthlyDebtPaymentsCLP: 0,
    savingsAmountCLP: application.savings_amount ?? 0,
    approvalProbability: mostLikelyBand?.approvalProbability ?? 0,
    avalMonthlySalaryCLP: guarantor?.monthly_income ?? undefined,
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
