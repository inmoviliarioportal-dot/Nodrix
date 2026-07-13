"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

/**
 * Supabase client for Client Components (browser).
 *
 * Safe to call multiple times / on every render — `createBrowserClient`
 * from `@supabase/ssr` memoizes the underlying instance internally.
 * Only ever uses the public URL + anon key (never the service role key).
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
