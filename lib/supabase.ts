/**
 * Entry point for Supabase clients. Split into `lib/supabase/*` internally
 * to keep server-only code (service role key, `next/headers`) out of any
 * bundle that could accidentally end up in the client.
 *
 * Usage:
 *   Server Components / Route Handlers:
 *     import { createSupabaseServerClient } from "@/lib/supabase";
 *     const supabase = await createSupabaseServerClient();
 *
 *   Client Components:
 *     import { createSupabaseBrowserClient } from "@/lib/supabase";
 *     const supabase = createSupabaseBrowserClient();
 *
 *   Privileged server-only tasks (bypasses RLS):
 *     import { createSupabaseServiceRoleClient } from "@/lib/supabase";
 */
export {
  createSupabaseServerClient,
  createSupabaseServiceRoleClient,
} from "./supabase/server";
export { createSupabaseBrowserClient } from "./supabase/client";
export type { Database, Json } from "./supabase/types";
