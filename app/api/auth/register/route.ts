import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import {
  createSupabaseServerClient,
  createSupabaseServiceRoleClient,
} from "@/lib/supabase";
import { apiError, withErrorHandling, HTTP_STATUS } from "@/app/api/_shared";
import { MVP_ORG_ID } from "../_constants";

type RegisterBody = {
  email?: string;
  password?: string;
  name?: string;
  phone?: string;
};

/**
 * POST /api/auth/register
 * Body: { email, password, name, phone }
 *
 * Creates the Supabase Auth user, then creates the matching `customers` row
 * (org_id fixed for the MVP) using the service role client — writes from a
 * Route Handler should bypass RLS explicitly rather than rely on it being
 * disabled.
 *
 * `customers.rut_hash` is NOT NULL in the schema, but RUT is not collected
 * at registration time (out of scope for this endpoint). We store a
 * deterministic placeholder (`pending:sha256(email)`) so the row satisfies
 * the constraint and stays unique per email; the leads/applications flow
 * is expected to overwrite it once the real RUT is captured.
 */
export const POST = withErrorHandling(async (request: Request) => {
  const body = (await request.json().catch(() => null)) as RegisterBody | null;

  if (!body?.email || !body?.password || !body?.name) {
    return apiError(
      "email, password y name son requeridos",
      HTTP_STATUS.BAD_REQUEST,
      "INVALID_BODY"
    );
  }

  const { email, password, name, phone } = body;

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

  const placeholderRutHash = `pending:${createHash("sha256").update(email).digest("hex")}`;

  const serviceRoleClient = createSupabaseServiceRoleClient() as any;
  const { data: customer, error: customerError } = await serviceRoleClient
    .from("customers")
    .insert({
      org_id: MVP_ORG_ID,
      rut_hash: placeholderRutHash,
      name,
      email,
      phone: phone ?? null,
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
