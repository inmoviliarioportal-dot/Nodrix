import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { apiError, requireAuth, withErrorHandling, HTTP_STATUS } from "@/app/api/_shared";
import { calculateScoring, loadActiveScoringConfig } from "@/lib/scoring";
import type { CustomerFinancialProfile } from "@/lib/scoring";
import { evaluateIncomeSources, type IncomeSource, type IncomeType } from "@/lib/income-types";
import {
  findCustomerByEmail,
  findLatestApplicationForCustomer,
  hashRutOrEmail,
  normalizeEmail,
  type ApplicationRow,
  type CustomerRow,
  type AnySupabaseClient,
} from "@/lib/leads";
import { MVP_ORG_ID } from "@/app/api/auth/_constants";
import { applyAutomaticTransitions } from "@/lib/stage-machine";
import { notifyStageChange } from "@/lib/notifications";

/**
 * POST /api/leads
 *
 * Body:
 * ```
 * {
 *   name: string,            // required
 *   email: string,           // required — MVP deduplication key
 *   phone?: string,
 *   rut?: string,            // optional in MVP; best-effort hashed, no real crypto yet
 *
 *   // Optional financial profile — if ALL of these are present, scoring is
 *   // calculated immediately and stored on the created application:
 *   incomeSources?: IncomeSource[], // ingreso mixto (ver lib/income-types.ts) -- preferido
 *   monthlySalary?: number,         // legado: usado solo si incomeSources no viene
 *   savingsAmount?: number,
 *   employmentType?: "indefinido" | "plazo_fijo" | "honorarios" | "independiente",
 *   employmentYears?: number,
 *   hasExistingDebt?: boolean,
 *   totalDebtBalance?: number, // saldo total de deuda de corto plazo (CLP), defaults to 0 when omitted
 * }
 * ```
 *
 * Behavior:
 * - If a customer with the same `email` already exists (case-insensitive),
 *   NO new customer/application is created — the existing customer + its
 *   most recent application are returned with `duplicate: true`.
 * - Otherwise a new `customer` row is created and an `application` is
 *   created immediately in stage `RECEPCIONADA`.
 * - Scoring trigger: as soon as the application is created (new lead path),
 *   if the financial profile fields above are ALL present, `calculateScoring()`
 *   runs synchronously (in-process, no HTTP) and `scoring_category` /
 *   `scoring_score` are saved on the same application row, advancing its
 *   stage to `SCORING_COMPLETADO` (logged in `application_stage_history`).
 *   If financial data is missing, scoring fields stay `null` — complete the
 *   profile later via `POST /api/leads/[id]/convert` (new application) or a
 *   future `PATCH /api/applications/[id]` profile-completion endpoint.
 */
export const POST = withErrorHandling(async (request: Request) => {
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return apiError("Invalid JSON body", HTTP_STATUS.BAD_REQUEST, "INVALID_BODY");
  }

  const { name, email, phone, rut, ...financial } = body as Record<string, unknown>;

  if (typeof name !== "string" || !name.trim()) {
    return apiError("`name` is required", HTTP_STATUS.BAD_REQUEST, "MISSING_NAME");
  }
  if (typeof email !== "string" || !email.trim() || !email.includes("@")) {
    return apiError("`email` is required and must be valid", HTTP_STATUS.BAD_REQUEST, "MISSING_EMAIL");
  }

  const supabase = createSupabaseServiceRoleClient() as unknown as AnySupabaseClient;
  const normalizedEmail = normalizeEmail(email);

  const existing = await findCustomerByEmail(supabase, MVP_ORG_ID, normalizedEmail);

  if (existing) {
    // El wizard ahora recolecta renta/tipo de inversión/estado del inmueble
    // (movidos del registro, ver lib/financial-bands.ts) -- persistirlos acá
    // en vez de en POST /api/auth/register, que ya no los pide. Best-effort:
    // un error acá no debe bloquear la creación/dedup del lead.
    await updateCustomerProfileFields(supabase, existing.id, financial);

    let latestApplication = await findLatestApplicationForCustomer(supabase, existing.id);

    // El customer puede existir sin ninguna application todavía (ej. se
    // registró vía POST /api/auth/register, que solo crea el customer). El
    // contrato de este endpoint es "crea o reutiliza el customer y siempre
    // deja al menos una application creada" — nunca `application: null`.
    if (!latestApplication) {
      const { data: newApplication, error: newApplicationError } = await supabase
        .from("applications")
        .insert({ org_id: MVP_ORG_ID, customer_id: existing.id })
        .select("*")
        .single();

      if (newApplicationError || !newApplication) {
        // 23505 = unique_violation: otra request concurrente para el mismo
        // customer ganó la carrera y ya creó su application (ver migración
        // 010, idx_applications_one_open_per_customer) -- no es un error
        // real, solo hay que devolver la que la otra request efectivamente
        // creó en vez de fallar.
        if ((newApplicationError as { code?: string } | null)?.code === "23505") {
          const raced = await findLatestApplicationForCustomer(supabase, existing.id);
          if (raced) {
            return NextResponse.json(
              { duplicate: true, customer: existing, application: raced },
              { status: HTTP_STATUS.CONFLICT }
            );
          }
        }
        return apiError(
          `Failed to create application for existing customer: ${newApplicationError?.message ?? "unknown error"}`,
          HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
      }

      const scored = await maybeApplyScoring(
        supabase,
        newApplication as { id: string; stage: string },
        financial
      );
      latestApplication = (scored ?? newApplication) as ApplicationRow;

      // Rama real de la mayoría de los clientes: ya se registraron (el
      // customer existe) y esta es su PRIMERA application, recién creada
      // acá mismo. El aval solo aplica a una application recién creada, así
      // que se inserta acá igual que en la rama "customer nuevo" de abajo.
      await maybeInsertGuarantor(supabase, (newApplication as ApplicationRow).id, financial);
    } else if (EDITABLE_LEAD_STAGES.includes(latestApplication.stage)) {
      // BUG REAL detectado en producción: si el customer ya tenía una
      // application (caso normal -- todo cliente se registra antes de
      // llegar al wizard), este endpoint históricamente solo actualizaba
      // `customers` y devolvía la application VIEJA sin recalcular nada --
      // por más que el cliente cambiara sus datos "a favor" en un segundo
      // paso por el wizard, seguía viendo el mismo resultado de scoring/UF
      // de antes. Mientras la application siga en una etapa editable
      // (Análisis de perfil o Documentación pendiente, antes de que el
      // banco reciba algo), recalculamos con los datos nuevos -- mismo
      // criterio que usa POST /api/applications/[id]/update-financial-profile.
      const rescored = await maybeApplyScoring(
        supabase,
        latestApplication as { id: string; stage: string },
        financial
      );
      if (rescored) {
        await (supabase.from("applications") as any)
          .update({
            initial_proposal_band: null,
            initial_proposal_purpose: null,
            initial_proposal_selected_at: null,
          })
          .eq("id", latestApplication.id);
        latestApplication = {
          ...(rescored as ApplicationRow),
          initial_proposal_band: null,
          initial_proposal_purpose: null,
          initial_proposal_selected_at: null,
        } as ApplicationRow;
        await maybeInsertGuarantor(supabase, latestApplication.id, financial);
      }
    }

    return NextResponse.json(
      { duplicate: true, customer: existing, application: latestApplication },
      { status: HTTP_STATUS.CONFLICT }
    );
  }

  const rutValue = typeof rut === "string" && rut.trim() ? rut.trim() : null;

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .insert({
      org_id: MVP_ORG_ID,
      rut_hash: hashRutOrEmail(rutValue ?? normalizedEmail),
      rut_ciphertext: rutValue, // TODO(identity): replace with real reversible encryption
      name: name.trim(),
      email: normalizedEmail,
      phone: typeof phone === "string" && phone.trim() ? phone.trim() : null,
    })
    .select("*")
    .single();

  if (customerError || !customer) {
    return apiError(
      `Failed to create customer: ${customerError?.message ?? "unknown error"}`,
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }

  await updateCustomerProfileFields(supabase, (customer as CustomerRow).id, financial);

  const { data: application, error: applicationError } = await supabase
    .from("applications")
    .insert({
      org_id: MVP_ORG_ID,
      customer_id: (customer as CustomerRow).id,
    })
    .select("*")
    .single();

  if (applicationError || !application) {
    return apiError(
      `Failed to create application: ${applicationError?.message ?? "unknown error"}`,
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }

  const scoredApplication = await maybeApplyScoring(
    supabase,
    application as { id: string; stage: string },
    financial
  );

  await maybeInsertGuarantor(supabase, (application as ApplicationRow).id, financial);

  return NextResponse.json(
    { duplicate: false, customer, application: scoredApplication ?? application },
    { status: 201 }
  );
});

const VALID_AVAL_RELATIONSHIPS = ["conyuge", "padre", "madre", "hijo", "hermano"];
const VALID_AVAL_EMPLOYMENT_TYPES = ["indefinido", "plazo_fijo", "honorarios", "independiente"];

/** Etapas en las que resubmitir el wizard (o editar desde el dashboard)
 * todavía puede recalcular el scoring -- antes de que el banco reciba algo. */
const EDITABLE_LEAD_STAGES = ["SCORING_COMPLETADO", "DOCUMENTOS_PENDIENTES"];

/**
 * Sincroniza la fila de `guarantors` de una application con el payload
 * (`hasAval: true/false`). Se usa tanto al crear una application nueva como
 * al re-enviar el wizard para una ya existente (ver rama `existing` de
 * arriba) -- por eso es upsert/delete, no solo insert: una resubmisión con
 * `hasAval: true` no debe violar `idx_guarantors_one_per_application`, y una
 * resubmisión con `hasAval: false` debe borrar un aval declarado antes.
 * Best-effort (mismo patrón que `updateCustomerProfileFields`): un error acá
 * no debe bloquear la creación/actualización del lead.
 */
async function maybeInsertGuarantor(
  supabase: AnySupabaseClient,
  applicationId: string,
  financial: Record<string, unknown>
): Promise<void> {
  if (financial.hasAval !== true) {
    await (supabase.from("guarantors") as any).delete().eq("application_id", applicationId);
    return;
  }

  const { avalRelationship, avalMonthlySalary, avalEmploymentType } = financial;
  if (
    typeof avalRelationship !== "string" ||
    !VALID_AVAL_RELATIONSHIPS.includes(avalRelationship) ||
    typeof avalMonthlySalary !== "number" ||
    typeof avalEmploymentType !== "string" ||
    !VALID_AVAL_EMPLOYMENT_TYPES.includes(avalEmploymentType)
  ) {
    return;
  }

  await (supabase.from("guarantors") as any).upsert(
    {
      org_id: MVP_ORG_ID,
      application_id: applicationId,
      relationship: avalRelationship,
      monthly_income: avalMonthlySalary,
      employment_type: avalEmploymentType,
    },
    { onConflict: "application_id" }
  );
}

/**
 * GET /api/leads
 *
 * Lists customers (leads) for the fixed MVP org, most recent first.
 * Query params: `email` (exact/ilike filter), `limit` (default 50, max 200).
 * Requires an authenticated session (internal/advisor use).
 */
export const GET = withErrorHandling(async (request: Request) => {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  const limit = Math.min(Number(searchParams.get("limit")) || 50, 200);

  const supabase = createSupabaseServiceRoleClient() as unknown as AnySupabaseClient;
  let query = supabase
    .from("customers")
    .select("*")
    .eq("org_id", MVP_ORG_ID)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (email) query = query.ilike("email", `%${normalizeEmail(email)}%`);

  const { data, error } = await query;
  if (error) {
    return apiError(`Failed to list leads: ${error.message}`, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }

  return NextResponse.json({ leads: data ?? [] });
});

/**
 * Applies scoring to a freshly created application when the request body
 * carries a full financial profile. Shared by `POST /api/leads` and
 * `POST /api/leads/[id]/convert`. Returns the updated application row, or
 * `null` if scoring was not triggered (insufficient financial data).
 */
export async function maybeApplyScoring(
  supabase: AnySupabaseClient,
  application: { id: string; stage: string },
  financial: Record<string, unknown>
) {
  const profile = extractFinancialProfile(financial);
  if (!profile) return null;

  const config = await loadActiveScoringConfig(MVP_ORG_ID, supabase as any);
  const result = calculateScoring(profile, config);

  // Fuentes de ingreso crudas (si vienen del wizard nuevo) -- se persisten
  // tal cual para que GET /api/applications/[id]/proposal-bands pueda
  // recalcular el tope de Leverage específico por tipo de ingreso más
  // adelante (ver lib/income-types.ts) sin volver a pedirle datos al cliente.
  const incomeSources = parseIncomeSources(financial.incomeSources);

  const { data: updated, error } = await supabase
    .from("applications")
    .update({
      scoring_category: result.category,
      scoring_score: result.score,
      // Persiste el ahorro real declarado -- antes se descartaba tras
      // calcular el score, lo que dejaba la pre-evaluación automática
      // (DOCUMENTOS_APROBADOS -> PRE_EVALUACION_COMPLETADA) sin datos reales.
      savings_amount: profile.savingsAmount,
      total_debt_balance: profile.hasExistingDebt ? profile.totalDebtBalance : 0,
      income_sources: incomeSources,
      stage: "SCORING_COMPLETADO",
    })
    .eq("id", application.id)
    .select("*")
    .single();

  if (error || !updated) return null;

  await supabase.from("application_stage_history").insert({
    application_id: application.id,
    from_stage: application.stage,
    to_stage: "SCORING_COMPLETADO",
    actor_user_id: null,
    note: `Auto-scoring: ${result.category} (${result.score}/100)`,
  });

  // Notificación por email al cliente (best-effort, ver lib/notifications.ts).
  await notifyStageChange(supabase, application.id, "SCORING_COMPLETADO");

  // SCORING_COMPLETADO -> DOCUMENTOS_PENDIENTES está marcada "automatic" en
  // la máquina de estados (lib/stage-machine.ts) — encadenarla aquí mismo en
  // vez de esperar a que alguien la dispare manualmente vía PATCH .../stage.
  const { finalStage } = await applyAutomaticTransitions(supabase, application.id, "SCORING_COMPLETADO");
  if (finalStage !== "SCORING_COMPLETADO") {
    return { ...updated, stage: finalStage };
  }

  return updated;
}

const VALID_INVESTMENT_TYPES = ["inversion", "vivienda_propia", "ambos"];
const VALID_PROPERTY_DESTINATIONS = ["vivir", "airbnb", "alquiler_tradicional", "venta_corto_plazo"];
const VALID_PROPERTY_STATUSES = ["en_verde", "en_blanco", "entrega_inmediata", "usado", "sin_definir"];
const VALID_PROFESSIONAL_LEVELS = ["profesional", "tecnico"];

/**
 * Persiste `investment_type`/`property_status`/`monthly_income`/
 * `professional_level` en `customers` cuando vienen en el body de POST
 * /api/leads. Estos campos se pedían antes en POST /api/auth/register; ahora
 * se recolectan en el Wizard de perfilamiento (rangos/tarjetas, ver
 * lib/financial-bands.ts) y llegan acá junto con el resto del perfil
 * financiero. Best-effort: si el update falla o los campos no vienen, no
 * bloquea la creación/dedup del lead (mismo patrón que `maybeApplyScoring`,
 * que tampoco bloquea si falta el perfil completo).
 */
export async function updateCustomerProfileFields(
  supabase: AnySupabaseClient,
  customerId: string,
  financial: Record<string, unknown>
): Promise<void> {
  const update: Record<string, unknown> = {};

  if (
    typeof financial.investmentType === "string" &&
    VALID_INVESTMENT_TYPES.includes(financial.investmentType)
  ) {
    update.investment_type = financial.investmentType;
  }
  if (
    typeof financial.propertyDestination === "string" &&
    VALID_PROPERTY_DESTINATIONS.includes(financial.propertyDestination)
  ) {
    update.property_destination = financial.propertyDestination;
  }
  if (
    typeof financial.propertyStatus === "string" &&
    VALID_PROPERTY_STATUSES.includes(financial.propertyStatus)
  ) {
    update.property_status = financial.propertyStatus;
  }
  if (
    typeof financial.professionalLevel === "string" &&
    VALID_PROFESSIONAL_LEVELS.includes(financial.professionalLevel)
  ) {
    update.professional_level = financial.professionalLevel;
  }
  const resolvedMonthlySalary = resolveEffectiveMonthlySalary(financial);
  if (typeof resolvedMonthlySalary === "number") {
    update.monthly_income = resolvedMonthlySalary;
  }

  if (Object.keys(update).length === 0) return;

  await supabase.from("customers").update(update).eq("id", customerId);
}

const VALID_INCOME_TYPES: IncomeType[] = ["sueldo_fijo", "boleta", "pension", "alquiler", "sociedad"];

/**
 * Valida y normaliza el body.incomeSources del wizard (ingreso mixto, ver
 * lib/income-types.ts). Devuelve `null` si no viene, viene vacío, o algún
 * elemento no es válido -- se trata como "no hay ingreso mixto declarado",
 * dejando que `extractFinancialProfile` intente el fallback legado
 * (`monthlySalary` plano, usado por integraciones antiguas / backoffice).
 */
export function parseIncomeSources(raw: unknown): IncomeSource[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;

  const sources: IncomeSource[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") return null;
    const it = item as Record<string, unknown>;

    if (typeof it.type !== "string" || !VALID_INCOME_TYPES.includes(it.type as IncomeType)) return null;
    if (typeof it.monthlyAmountCLP !== "number") return null;

    const source: IncomeSource = { type: it.type as IncomeType, monthlyAmountCLP: it.monthlyAmountCLP };
    if (typeof it.hasSignificantBonusIncome === "boolean") source.hasSignificantBonusIncome = it.hasSignificantBonusIncome;
    if (typeof it.isVariableBoleta === "boolean") source.isVariableBoleta = it.isVariableBoleta;
    if (typeof it.ageYears === "number") source.ageYears = it.ageYears;
    if (typeof it.rentalContractMonths === "number") source.rentalContractMonths = it.rentalContractMonths;
    if (typeof it.companyHasLiquidity === "boolean") source.companyHasLiquidity = it.companyHasLiquidity;
    sources.push(source);
  }
  return sources;
}

/**
 * Resuelve el ingreso mensual efectivo a usar en el scoring: si el body trae
 * `incomeSources` válidos (wizard nuevo, ingreso mixto), se usa el ingreso
 * efectivo ya con haircuts aplicados (`evaluateIncomeSources`). Si no, cae
 * al campo legado `monthlySalary` (integraciones antiguas / recalculo manual
 * desde backoffice vía POST /api/scoring/calculate, que sigue mandando el
 * perfil plano de siempre).
 */
function resolveEffectiveMonthlySalary(input: Record<string, unknown>): number | null {
  const incomeSources = parseIncomeSources(input.incomeSources);
  if (incomeSources) {
    return evaluateIncomeSources(incomeSources).effectiveMonthlyIncomeCLP;
  }
  return typeof input.monthlySalary === "number" ? input.monthlySalary : null;
}

/**
 * Requires ALL financial profile fields to be present and well-typed before
 * triggering scoring — a partially-filled profile is treated as "not ready
 * yet" per the spec (scoring stays null until the profile is complete).
 */
export function extractFinancialProfile(
  input: Record<string, unknown>
): CustomerFinancialProfile | null {
  const { savingsAmount, employmentType, employmentYears, hasExistingDebt } = input;

  const validEmploymentTypes = ["indefinido", "plazo_fijo", "honorarios", "independiente"];

  const monthlySalary = resolveEffectiveMonthlySalary(input);

  if (
    monthlySalary === null ||
    typeof savingsAmount !== "number" ||
    typeof employmentType !== "string" ||
    !validEmploymentTypes.includes(employmentType) ||
    typeof employmentYears !== "number" ||
    typeof hasExistingDebt !== "boolean"
  ) {
    return null;
  }

  const totalDebtBalance =
    typeof input.totalDebtBalance === "number" ? input.totalDebtBalance : 0;

  return {
    monthlySalary,
    savingsAmount,
    employmentType: employmentType as CustomerFinancialProfile["employmentType"],
    employmentYears,
    hasExistingDebt,
    totalDebtBalance,
  };
}
