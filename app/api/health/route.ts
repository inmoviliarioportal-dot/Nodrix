import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase";
import { withErrorHandling } from "@/app/api/_shared";

/**
 * Basic health check route. Also serves as a compile-time smoke test that
 * `lib/supabase.ts` and `app/api/_shared` type-check correctly together.
 */
export const GET = withErrorHandling(async () => {
  // Instantiate the client to prove it wires up without type errors.
  // Does not require a live Supabase project to build.
  await createSupabaseServerClient();

  return NextResponse.json({ status: "ok" });
});
