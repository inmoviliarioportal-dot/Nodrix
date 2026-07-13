import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Supabase client for Server Components, Server Functions and Route Handlers.
 *
 * Next.js 16 note: `cookies()` from `next/headers` is an ASYNC function
 * (breaking change vs. Next <15, where it was sync). This client factory
 * must therefore be created with `await createSupabaseServerClient()` at
 * every call site — it cannot be a module-level singleton.
 *
 * Writing cookies (`set`/`delete`) only works inside a Server Function or
 * a Route Handler. If this client is used from a Server Component render
 * (e.g. a `page.tsx`), the `setAll` call below will throw when Supabase
 * tries to refresh the session — that failure is caught and ignored on
 * purpose, since middleware (if/when added) is the place responsible for
 * refreshing the session cookie during navigation.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Called from a Server Component during rendering — cookies
            // can't be written there. Safe to ignore as long as session
            // refresh is otherwise handled (e.g. in middleware).
          }
        },
      },
    }
  );
}

/**
 * Supabase client with the service role key, for privileged server-only
 * operations (bypasses Row Level Security). NEVER import this from code
 * that can run in the browser, and never forward its key to the client.
 *
 * Use only inside Route Handlers / server-only modules for tasks like
 * admin scripts, scoring engine jobs, or seeding — not for regular
 * per-user requests (use `createSupabaseServerClient` for those, so RLS
 * still applies once enabled).
 */
export function createSupabaseServiceRoleClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
