import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { apiError, requirePermission, withErrorHandling, HTTP_STATUS } from "@/app/api/_shared";
import { MVP_ORG_ID } from "@/app/api/auth/_constants";
import type { AnySupabaseClient } from "@/lib/leads";
import { loanTermYearsFor, type LoanTermTier } from "@/lib/loan-term";
import type { ProfessionalLevel } from "@/lib/proposal-risk";
import { rowToVariableSet, type WizardVariableSetRow } from "../_shared";
import {
  ageTierLabel,
  impliedMonthlyInstallmentFromMaxUF,
  recalcMaxLoanUF,
  SIMULATION_FALLBACK_YEARS_V1,
} from "@/lib/loan-term-simulation";

type SimulateBody = { draftVersion?: number };

interface ApplicationRow {
  id: string;
  stage: string;
  pre_evaluation_max_uf: number | null;
  customer_id: string;
}

interface CustomerRow {
  id: string;
  birth_date: string | null;
  professional_level: string | null;
}

/**
 * POST /api/admin/wizard-variables/simulate
 *
 * Body: `{ draftVersion: number }` -- número de versión del borrador
 * (`wizard_variable_sets`, `status = 'draft'`) a simular.
 *
 * Requiere permiso de módulo "variables" nivel "view" como mínimo: simular
 * es de SOLO LECTURA sobre `applications`/`customers` (no modifica ninguna
 * solicitud ni cliente, solo escribe `simulated_at` en la propia fila del
 * borrador que se está simulando). En la práctica solo quien puede editar el
 * borrador (nivel "edit") va a llegar hasta acá desde la UI -- el botón
 * "Simular impacto" solo aparece junto al editor -- pero no hay razón para
 * exigir "edit" a nivel de API cuando la operación en sí no escribe ninguna
 * `application`/`customer`. Mismo criterio de separación lectura/escritura
 * que `lib/wizard-variables.ts` (`resolveVariablesForRead` de solo lectura
 * vs. `pinActiveVariables` que sí escribe).
 *
 * Reutiliza `loanTermYearsFor` (lib/loan-term.ts, la misma función que ya
 * usa `calculateUFPreEvaluation` internamente) para resolver el plazo real
 * por edad x nivel profesional contra `loan_terms.tiers` del borrador. Para
 * reconstruir `maxMonthlyInstallmentCLP` de cada solicitud sin releer
 * renta/deuda/ahorro crudos (no están completos/estables en
 * `applications`/`customers` para reconstruir 1:1 el input original de
 * `calculateUFPreEvaluation`), usa el mismo enfoque ya probado en
 * `scripts/loan-term-impact-report.ts`: invertir la fórmula de anualidad
 * desde `pre_evaluation_max_uf` con el plazo v1 (25 años). Esas dos
 * funciones (`impliedMonthlyInstallmentFromMaxUF` / `recalcMaxLoanUF`) se
 * extrajeron a `lib/loan-term-simulation.ts` para que este Route Handler y
 * el script standalone las compartan en vez de duplicar la fórmula una
 * tercera vez.
 *
 * Al terminar exitosamente, actualiza `simulated_at = now()` en la fila del
 * borrador -- habilita el botón de publicar (`.../[version]/publish`, que
 * exige `simulated_at` no nulo).
 */
export const POST = withErrorHandling(async (request: Request) => {
  const auth = await requirePermission("variables", "view");
  if (!auth.authorized) return auth.response;

  const body = (await request.json().catch(() => null)) as SimulateBody | null;
  const draftVersion = body?.draftVersion;
  if (!Number.isInteger(draftVersion) || (draftVersion as number) <= 0) {
    return apiError(
      "draftVersion es requerido y debe ser un entero positivo.",
      HTTP_STATUS.BAD_REQUEST,
      "INVALID_DRAFT_VERSION"
    );
  }

  const supabase = createSupabaseServiceRoleClient() as unknown as AnySupabaseClient;

  const { data: draftRow, error: draftError } = await (supabase.from("wizard_variable_sets") as any)
    .select(
      "id, org_id, version, status, note, simulated_at, created_by, created_at, loan_terms, qualification, banking_params, probabilities, assumptions"
    )
    .eq("org_id", MVP_ORG_ID)
    .eq("version", draftVersion)
    .eq("status", "draft")
    .maybeSingle();

  if (draftError) {
    return apiError(draftError.message, HTTP_STATUS.INTERNAL_SERVER_ERROR, "WIZARD_VARIABLES_FETCH_FAILED");
  }
  const target = draftRow as WizardVariableSetRow | null;
  if (!target) {
    return apiError(
      `No existe un borrador (status='draft') con version=${draftVersion}.`,
      HTTP_STATUS.NOT_FOUND,
      "DRAFT_NOT_FOUND"
    );
  }

  const variableSet = rowToVariableSet(target);
  const minQualifyingUF = variableSet.qualification.minQualifyingUF;
  const fallbackYears = variableSet.loanTerms.fallbackYears ?? SIMULATION_FALLBACK_YEARS_V1;
  const tiers = variableSet.loanTerms.tiers as Partial<Record<ProfessionalLevel, LoanTermTier[]>>;

  const { data: applications, error: appsError } = await (supabase.from("applications") as any)
    .select("id, stage, pre_evaluation_max_uf, customer_id")
    .eq("org_id", MVP_ORG_ID)
    .neq("stage", "CIERRE");

  if (appsError) {
    return apiError(appsError.message, HTTP_STATUS.INTERNAL_SERVER_ERROR, "APPLICATIONS_FETCH_FAILED");
  }

  const apps = (applications ?? []) as ApplicationRow[];

  let customerById = new Map<string, CustomerRow>();
  if (apps.length > 0) {
    const customerIds = [...new Set(apps.map((a) => a.customer_id))];
    const { data: customers, error: custError } = await (supabase.from("customers") as any)
      .select("id, birth_date, professional_level")
      .in("id", customerIds);

    if (custError) {
      return apiError(custError.message, HTTP_STATUS.INTERNAL_SERVER_ERROR, "CUSTOMERS_FETCH_FAILED");
    }
    customerById = new Map<string, CustomerRow>(((customers ?? []) as CustomerRow[]).map((c) => [c.id, c]));
  }

  let analyzed = 0;
  let insufficientData = 0;
  let changed = 0;
  let deltaSumUF = 0;
  let newlyDisqualified = 0;
  let newlyQualified = 0;
  let maxDropUF = 0;
  let maxDropApplicationId: string | null = null;
  const byAgeTier = new Map<string, number>();

  for (const app of apps) {
    const customer = customerById.get(app.customer_id);

    const professionalLevel: ProfessionalLevel | null =
      customer?.professional_level === "profesional" || customer?.professional_level === "tecnico"
        ? (customer.professional_level as ProfessionalLevel)
        : null;

    if (!customer?.birth_date || !professionalLevel) {
      insufficientData += 1;
      continue;
    }

    analyzed += 1;

    const oldMaxUF = Number(app.pre_evaluation_max_uf ?? 0);
    const impliedInstallment = impliedMonthlyInstallmentFromMaxUF(oldMaxUF);

    const term = loanTermYearsFor({
      birthDate: customer.birth_date,
      professionalLevel,
      avalBirthDate: null, // guarantors no guarda birth_date hoy (migración 017_guarantors.sql)
      tiers: tiers as Record<ProfessionalLevel, LoanTermTier[]>,
      fallbackYears,
    });

    const newMaxUF = recalcMaxLoanUF(impliedInstallment, term.years);
    const disqualifiedByAge = term.years === null;

    const wasQualified = oldMaxUF >= minQualifyingUF;
    const isQualified = !disqualifiedByAge && newMaxUF >= minQualifyingUF;

    const delta = newMaxUF - oldMaxUF;
    if (Math.abs(delta) > 0.01) {
      changed += 1;
      deltaSumUF += delta;
    }
    if (delta < -maxDropUF) {
      maxDropUF = -delta;
      maxDropApplicationId = app.id;
    }
    if (wasQualified && !isQualified) newlyDisqualified += 1;
    if (!wasQualified && isQualified) newlyQualified += 1;

    const tierLabel = ageTierLabel(term.effectiveAge);
    byAgeTier.set(tierLabel, (byAgeTier.get(tierLabel) ?? 0) + 1);
  }

  const simulatedAt = new Date().toISOString();
  const { error: updateError } = await (supabase.from("wizard_variable_sets") as any)
    .update({ simulated_at: simulatedAt })
    .eq("id", target.id);

  if (updateError) {
    return apiError(
      `La simulación se calculó pero no se pudo marcar simulated_at: ${updateError.message}`,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "SIMULATED_AT_UPDATE_FAILED"
    );
  }

  return NextResponse.json({
    draftVersion: target.version,
    simulatedAt,
    totalAnalyzed: analyzed,
    insufficientData,
    changed,
    averageDeltaUF: analyzed > 0 ? deltaSumUF / analyzed : 0,
    newlyDisqualified,
    newlyQualified,
    maxDropUF,
    maxDropApplicationId,
    byAgeTier: Object.fromEntries(byAgeTier),
  });
});
