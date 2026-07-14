import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * `lib/supabase/types.ts` is still the DB Architect's placeholder
 * (`Tables: Record<string, never>`), so every generated row/insert/update
 * type collapses to `never`. Until real generated types land, this domain's
 * Route Handlers operate against a loosely-typed client and rely on the
 * hand-written row interfaces below instead of Supabase's generics.
 */
export type AnySupabaseClient = SupabaseClient<any, any, any>;

/**
 * Deduplication + shared row-shape helpers for Leads (customers) and
 * Applications. Kept outside the Route Handlers so both `POST /api/leads`
 * and `POST /api/leads/[id]/convert` can reuse the same logic.
 *
 * NOTE on RUT: full RUT hashing/encryption infrastructure (key management,
 * `rut_ciphertext` reversible crypto) is out of scope for this agent — see
 * `.claude/agents/leads-applications.md`. For Release 1 we deduplicate by
 * `email` (allowed simplification per that spec) and only best-effort hash
 * the RUT (if provided) so the NOT NULL `rut_hash` column is always filled.
 */

/** Deterministic (non-cryptographic-key) hash used purely for the NOT NULL
 * `rut_hash` uniqueness column. Real RUT hashing/encryption is a future
 * concern owned by the Identity domain. */
export function hashRutOrEmail(rutOrEmail: string): string {
  return createHash("sha256").update(rutOrEmail.trim().toLowerCase()).digest("hex");
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export interface CustomerRow {
  id: string;
  org_id: string;
  rut_hash: string;
  rut_ciphertext: string | null;
  name: string;
  email: string;
  phone: string | null;
  created_at: string;
}

export interface ApplicationRow {
  id: string;
  org_id: string;
  customer_id: string;
  stage: string;
  scoring_category: string | null;
  scoring_score: number | null;
  pre_evaluation_min_uf: number | null;
  pre_evaluation_max_uf: number | null;
  assigned_advisor_id?: string | null;
  created_at: string;
  updated_at: string;
}

/** All valid `applications.stage` values — mirrors the CHECK constraint in
 * `database/schema.sql` exactly. Keep this list in sync with that file. */
export const APPLICATION_STAGES = [
  "RECEPCIONADA",
  "SCORING_COMPLETADO",
  "DOCUMENTOS_PENDIENTES",
  "DOCUMENTOS_APROBADOS",
  "PRE_EVALUACION_COMPLETADA",
  "VISITA_COMPLETADA",
  "ENVIADO_A_BANCO",
  "ESCRITURACION_AGENDADA",
  "CIERRE",
] as const;

export type ApplicationStage = (typeof APPLICATION_STAGES)[number];

export function isValidStage(value: unknown): value is ApplicationStage {
  return typeof value === "string" && (APPLICATION_STAGES as readonly string[]).includes(value);
}

/**
 * Finds an existing customer for this org by email (case-insensitive) —
 * the MVP deduplication key. Returns `null` if none exists.
 */
export async function findCustomerByEmail(
  supabase: AnySupabaseClient,
  orgId: string,
  email: string
): Promise<CustomerRow | null> {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("org_id", orgId)
    .ilike("email", normalizeEmail(email))
    .maybeSingle();

  if (error) throw error;
  return (data as CustomerRow | null) ?? null;
}

/** Most recent application for a customer, if any. */
export async function findLatestApplicationForCustomer(
  supabase: AnySupabaseClient,
  customerId: string
): Promise<ApplicationRow | null> {
  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data as ApplicationRow | null) ?? null;
}
