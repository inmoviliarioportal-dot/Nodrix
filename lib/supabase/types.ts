/**
 * Placeholder database types.
 *
 * The DB Architect agent will replace this file's contents with the real
 * generated types once `database/schema.sql` is finalized, via:
 *
 *   supabase gen types typescript --local > lib/supabase/types.ts
 *
 * Until then, this minimal shape keeps the Supabase clients type-safe
 * (generic `Database` param) without blocking other agents from building
 * on top of `lib/supabase.ts`.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
