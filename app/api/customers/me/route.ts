import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase";
import { requireAuth, withErrorHandling, apiError, HTTP_STATUS } from "@/app/api/_shared";
import { MVP_ORG_ID } from "@/app/api/auth/_constants";

const VALID_GENDERS = ["femenino", "masculino", "prefiero_no_decir"];
const VALID_INVESTMENT_TYPES = ["inversion", "vivienda_propia", "ambos"];
const VALID_PROPERTY_STATUSES = ["en_verde", "en_blanco", "entrega_inmediata", "usado", "sin_definir"];

/** Campos editables desde "Editar mis datos". RUT y email quedan fuera de
 * este endpoint a propósito: RUT es la identidad del cliente, y cambiar el
 * email requeriría el flujo de confirmación de Supabase Auth (fuera de
 * scope de esta iteración). */
type UpdateBody = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  gender?: string;
  birthDate?: string;
  age?: number;
  monthlyIncome?: number;
  investmentType?: string;
  propertyStatus?: string;
};

/**
 * GET /api/customers/me — devuelve la fila `customers` del usuario autenticado.
 * PATCH /api/customers/me — actualiza los campos de perfil editables.
 *
 * `customers` no tiene `user_id` (ver nota en app/api/auth/user/route.ts) —
 * el match es por `(org_id, email)` usando el email de la sesión.
 */
export const GET = withErrorHandling(async () => {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  const supabase = createSupabaseServiceRoleClient() as any;
  const { data: customer, error } = await supabase
    .from("customers")
    .select()
    .eq("org_id", MVP_ORG_ID)
    .eq("email", auth.user.email)
    .maybeSingle();

  if (error) {
    return apiError(error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR, "CUSTOMER_FETCH_FAILED");
  }
  if (!customer) {
    return apiError("Customer not found", HTTP_STATUS.NOT_FOUND, "CUSTOMER_NOT_FOUND");
  }

  return NextResponse.json({ customer });
});

export const PATCH = withErrorHandling(async (request: Request) => {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  const body = (await request.json().catch(() => null)) as UpdateBody | null;
  if (!body || typeof body !== "object") {
    return apiError("Invalid JSON body", HTTP_STATUS.BAD_REQUEST, "INVALID_BODY");
  }

  if (body.gender !== undefined && !VALID_GENDERS.includes(body.gender)) {
    return apiError(`gender inválido. Valores permitidos: ${VALID_GENDERS.join(", ")}`, HTTP_STATUS.BAD_REQUEST, "INVALID_GENDER");
  }
  if (body.investmentType !== undefined && !VALID_INVESTMENT_TYPES.includes(body.investmentType)) {
    return apiError(
      `investmentType inválido. Valores permitidos: ${VALID_INVESTMENT_TYPES.join(", ")}`,
      HTTP_STATUS.BAD_REQUEST,
      "INVALID_INVESTMENT_TYPE"
    );
  }
  if (body.propertyStatus !== undefined && !VALID_PROPERTY_STATUSES.includes(body.propertyStatus)) {
    return apiError(
      `propertyStatus inválido. Valores permitidos: ${VALID_PROPERTY_STATUSES.join(", ")}`,
      HTTP_STATUS.BAD_REQUEST,
      "INVALID_PROPERTY_STATUS"
    );
  }
  if (body.age !== undefined && (typeof body.age !== "number" || body.age < 18 || body.age > 120)) {
    return apiError("age debe ser un número entre 18 y 120", HTTP_STATUS.BAD_REQUEST, "INVALID_AGE");
  }
  if (body.monthlyIncome !== undefined && (typeof body.monthlyIncome !== "number" || body.monthlyIncome < 0)) {
    return apiError("monthlyIncome debe ser un número >= 0", HTTP_STATUS.BAD_REQUEST, "INVALID_MONTHLY_INCOME");
  }

  const supabase = createSupabaseServiceRoleClient() as any;

  const { data: existing, error: findError } = await supabase
    .from("customers")
    .select("id, first_name, last_name")
    .eq("org_id", MVP_ORG_ID)
    .eq("email", auth.user.email)
    .maybeSingle();

  if (findError) {
    return apiError(findError.message, HTTP_STATUS.INTERNAL_SERVER_ERROR, "CUSTOMER_FETCH_FAILED");
  }
  if (!existing) {
    return apiError("Customer not found", HTTP_STATUS.NOT_FOUND, "CUSTOMER_NOT_FOUND");
  }

  const updates: Record<string, unknown> = {};
  if (body.firstName !== undefined) updates.first_name = body.firstName;
  if (body.lastName !== undefined) updates.last_name = body.lastName;
  if (body.phone !== undefined) updates.phone = body.phone;
  if (body.gender !== undefined) updates.gender = body.gender;
  if (body.birthDate !== undefined) updates.birth_date = body.birthDate;
  if (body.age !== undefined) updates.age = body.age;
  if (body.monthlyIncome !== undefined) updates.monthly_income = body.monthlyIncome;
  if (body.investmentType !== undefined) updates.investment_type = body.investmentType;
  if (body.propertyStatus !== undefined) updates.property_status = body.propertyStatus;

  // `customers.name` sigue siendo el campo consumido por el resto del flujo
  // de leads (ver app/api/auth/register/route.ts) — recomputarlo si cambia
  // nombre/apellido.
  if (body.firstName !== undefined || body.lastName !== undefined) {
    const firstName = body.firstName ?? existing.first_name ?? "";
    const lastName = body.lastName ?? existing.last_name ?? "";
    updates.name = `${firstName} ${lastName}`.trim();
  }

  const { data: updated, error: updateError } = await supabase
    .from("customers")
    .update(updates)
    .eq("id", existing.id)
    .select()
    .single();

  if (updateError) {
    return apiError(updateError.message, HTTP_STATUS.INTERNAL_SERVER_ERROR, "CUSTOMER_UPDATE_FAILED");
  }

  return NextResponse.json({ customer: updated });
});
