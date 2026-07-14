import { NextResponse } from "next/server";
import {
  createSupabaseServerClient,
  createSupabaseServiceRoleClient,
} from "@/lib/supabase";
import { apiError, withErrorHandling, HTTP_STATUS } from "@/app/api/_shared";
import { hashRutOrEmail } from "@/lib/leads";
import { MVP_ORG_ID } from "../_constants";

type RegisterBody = {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  rut?: string;
  gender?: string;
  birthDate?: string;
  age?: number;
  phone?: string;
  monthlyIncome?: number;
  investmentType?: string;
  propertyStatus?: string;
};

const VALID_GENDERS = ["femenino", "masculino", "otro", "prefiero_no_decir"];
const VALID_INVESTMENT_TYPES = ["inversion", "vivienda_propia"];
const VALID_PROPERTY_STATUSES = ["en_verde", "en_blanco", "usado", "sin_definir"];

const REQUIRED_FIELDS: (keyof RegisterBody)[] = [
  "email",
  "password",
  "firstName",
  "lastName",
  "rut",
  "gender",
  "birthDate",
  "age",
  "phone",
  "monthlyIncome",
  "investmentType",
  "propertyStatus",
];

/**
 * POST /api/auth/register
 *
 * Perfil completo del cliente recolectado al registrarse (antes solo se
 * pedía nombre/email/teléfono) — ver `database/migrations/004_customer_profile_fields.sql`.
 *
 * Body: { email, password, firstName, lastName, rut, gender, birthDate, age,
 *         phone, monthlyIncome, investmentType, propertyStatus }
 *
 * Creates the Supabase Auth user, then creates the matching `customers` row
 * (org_id fixed for the MVP) using the service role client — writes from a
 * Route Handler should bypass RLS explicitly rather than rely on it being
 * disabled.
 *
 * `customers.rut_hash`/`rut_ciphertext`: el RUT se hashea (sha256, ver
 * `hashRutOrEmail`) para la columna de unicidad; `rut_ciphertext` guarda el
 * valor tal cual (sin cifrado real todavía — misma simplificación de MVP ya
 * documentada en `lib/leads.ts`, cifrado real es un futuro trabajo de
 * Identity, no de este endpoint).
 */
export const POST = withErrorHandling(async (request: Request) => {
  const body = (await request.json().catch(() => null)) as RegisterBody | null;

  if (!body) {
    return apiError("Invalid JSON body", HTTP_STATUS.BAD_REQUEST, "INVALID_BODY");
  }

  const missing = REQUIRED_FIELDS.filter((field) => {
    const value = body[field];
    return value === undefined || value === null || value === "";
  });
  if (missing.length > 0) {
    return apiError(
      `Campos requeridos faltantes: ${missing.join(", ")}`,
      HTTP_STATUS.BAD_REQUEST,
      "INVALID_BODY"
    );
  }

  const {
    email,
    password,
    firstName,
    lastName,
    rut,
    gender,
    birthDate,
    age,
    phone,
    monthlyIncome,
    investmentType,
    propertyStatus,
  } = body as Required<RegisterBody>;

  if (!VALID_GENDERS.includes(gender)) {
    return apiError(`gender inválido. Valores permitidos: ${VALID_GENDERS.join(", ")}`, HTTP_STATUS.BAD_REQUEST, "INVALID_GENDER");
  }
  if (!VALID_INVESTMENT_TYPES.includes(investmentType)) {
    return apiError(
      `investmentType inválido. Valores permitidos: ${VALID_INVESTMENT_TYPES.join(", ")}`,
      HTTP_STATUS.BAD_REQUEST,
      "INVALID_INVESTMENT_TYPE"
    );
  }
  if (!VALID_PROPERTY_STATUSES.includes(propertyStatus)) {
    return apiError(
      `propertyStatus inválido. Valores permitidos: ${VALID_PROPERTY_STATUSES.join(", ")}`,
      HTTP_STATUS.BAD_REQUEST,
      "INVALID_PROPERTY_STATUS"
    );
  }
  if (typeof age !== "number" || age < 18 || age > 120) {
    return apiError("age debe ser un número entre 18 y 120", HTTP_STATUS.BAD_REQUEST, "INVALID_AGE");
  }
  if (typeof monthlyIncome !== "number" || monthlyIncome < 0) {
    return apiError("monthlyIncome debe ser un número >= 0", HTTP_STATUS.BAD_REQUEST, "INVALID_MONTHLY_INCOME");
  }

  const name = `${firstName} ${lastName}`.trim();

  const supabase = await createSupabaseServerClient();
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
    },
  });

  if (signUpError) {
    return apiError(signUpError.message, HTTP_STATUS.BAD_REQUEST, "SIGNUP_FAILED");
  }

  if (!signUpData.user) {
    return apiError(
      "No se pudo crear el usuario",
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "SIGNUP_NO_USER"
    );
  }

  const rutHash = hashRutOrEmail(rut);

  const serviceRoleClient = createSupabaseServiceRoleClient() as any;

  // `application_stage_history.actor_user_id` and other audit trails FK to
  // `public.users(id)`, which must mirror `auth.users.id` 1:1 (see schema.sql).
  // Without this insert, any later action attributed to this user (e.g. a
  // stage transition) fails with a foreign key violation.
  const { error: userError } = await serviceRoleClient.from("users").insert({
    id: signUpData.user.id,
    org_id: MVP_ORG_ID,
    email,
    full_name: name,
  });

  if (userError) {
    return apiError(
      userError.message,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "USER_CREATE_FAILED"
    );
  }

  const { data: customer, error: customerError } = await serviceRoleClient
    .from("customers")
    .insert({
      org_id: MVP_ORG_ID,
      rut_hash: rutHash,
      rut_ciphertext: rut,
      name,
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      gender,
      birth_date: birthDate,
      age,
      monthly_income: monthlyIncome,
      investment_type: investmentType,
      property_status: propertyStatus,
    })
    .select()
    .single();

  if (customerError) {
    return apiError(
      customerError.message,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "CUSTOMER_CREATE_FAILED"
    );
  }

  return NextResponse.json({ user: signUpData.user, customer }, { status: 201 });
});
