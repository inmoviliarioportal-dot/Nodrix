import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { apiError, requireAuth, withErrorHandling, HTTP_STATUS } from "@/app/api/_shared";
import { calculateScoring, loadActiveScoringConfig } from "@/lib/scoring";
import type { CustomerFinancialProfile } from "@/lib/scoring";
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
 *   monthlySalary?: number,
 *   savingsAmount?: number,
 *   employmentType?: "indefinido" | "plazo_fijo" | "honorarios" | "independiente",
 *   employmentYears?: number,
 *   hasExistingDebt?: boolean,
 *   monthlyDebtPayments?: number, // defaults to 0 when omitted
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

/**
 * Inserta la fila de `guarantors` para una application RECIÉN creada, si el
 * payload trae `hasAval: true` con los 3 campos requeridos bien tipados.
 * Best-effort (mismo patrón que `updateCustomerProfileFields`): un error acá
 * no debe bloquear la creación del lead.
 */
async function maybeInsertGuarantor(
  supabase: AnySupabaseClient,
  applicationId: string,
  financial: Record<string, unknown>
): Promise<void> {
  if (financial.hasAval !== true) return;

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

  await supabase.from("guarantors").insert({
    org_id: MVP_ORG_ID,
    application_id: applicationId,
    relationship: avalRelationship,
    monthly_income: avalMonthlySalary,
    employment_type: avalEmploymentType,
  });
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

  const { data: updated, error } = await supabase
    .from("applications")
    .update({
      scoring_category: result.category,
      scoring_score: result.score,
      // Persiste el ahorro real declarado -- antes se descartaba tras
      // calcular el score, lo que dejaba la pre-evaluación automática
      // (DOCUMENTOS_APROBADOS -> PRE_EVALUACION_COMPLETADA) sin datos reales.
      savings_amount: profile.savingsAmount,
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
const VALID_PROPERTY_STATUSES = ["en_verde", "en_blanco", "entrega_inmediata", "usado", "sin_definir"];

/**
 * Persiste `investment_type`/`property_status`/`monthly_income` en `customers`
 * cuando vienen en el body de POST /api/leads. Estos 3 campos se pedían antes
 * en POST /api/auth/register; ahora se recolectan en el Wizard de
 * perfilamiento (rangos/tarjetas, ver lib/financial-bands.ts) y llegan acá
 * junto con el resto del perfil financiero. Best-effort: si el update falla o
 * los campos no vienen, no bloquea la creación/dedup del lead (mismo patrón
 * que `maybeApplyScoring`, que tampoco bloquea si falta el perfil completo).
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
    typeof financial.propertyStatus === "string" &&
    VALID_PROPERTY_STATUSES.includes(financial.propertyStatus)
  ) {
    update.property_status = financial.propertyStatus;
  }
  if (typeof financial.monthlySalary === "number") {
    update.monthly_income = financial.monthlySalary;
  }

  if (Object.keys(update).length === 0) return;

  await supabase.from("customers").update(update).eq("id", customerId);
}

/**
 * Requires ALL financial profile fields to be present and well-typed before
 * triggering scoring — a partially-filled profile is treated as "not ready
 * yet" per the spec (scoring stays null until the profile is complete).
 */
export function extractFinancialProfile(
  input: Record<string, unknown>
): CustomerFinancialProfile | null {
  const { monthlySalary, savingsAmount, employmentType, employmentYears, hasExistingDebt } = input;

  const validEmploymentTypes = ["indefinido", "plazo_fijo", "honorarios", "independiente"];

  if (
    typeof monthlySalary !== "number" ||
    typeof savingsAmount !== "number" ||
    typeof employmentType !== "string" ||
    !validEmploymentTypes.includes(employmentType) ||
    typeof employmentYears !== "number" ||
    typeof hasExistingDebt !== "boolean"
  ) {
    return null;
  }

  const monthlyDebtPayments =
    typeof input.monthlyDebtPayments === "number" ? input.monthlyDebtPayments : 0;

  return {
    monthlySalary,
    savingsAmount,
    employmentType: employmentType as CustomerFinancialProfile["employmentType"],
    employmentYears,
    hasExistingDebt,
    monthlyDebtPayments,
  };
}
