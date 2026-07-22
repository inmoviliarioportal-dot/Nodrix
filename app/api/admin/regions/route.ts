import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase";
import { apiError, requireRole, withErrorHandling, HTTP_STATUS } from "@/app/api/_shared";

/**
 * GET /api/admin/regions — lista las 16 regiones (activas o no).
 * PATCH /api/admin/regions — { id, enabled } activa/desactiva una región.
 * Mismo patrón simple de gate por rol que /api/admin/properties (sin el
 * sistema de permisos granulares de lib/permissions.ts).
 */
export const GET = withErrorHandling(async () => {
  const auth = await requireRole(["admin", "gerencia"]);
  if (!auth.authorized) return auth.response;

  const supabase = createSupabaseServiceRoleClient() as any;
  const { data, error } = await supabase.from("regions").select("*").order("name", { ascending: true });

  if (error) {
    return apiError(error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR, "REGIONS_FETCH_FAILED");
  }

  return NextResponse.json({ regions: data ?? [] });
});

type PatchBody = {
  id?: string;
  enabled?: boolean;
};

export const PATCH = withErrorHandling(async (request: Request) => {
  const auth = await requireRole(["admin", "gerencia"]);
  if (!auth.authorized) return auth.response;

  const body = (await request.json().catch(() => null)) as PatchBody | null;
  if (!body?.id || typeof body.enabled !== "boolean") {
    return apiError("id y enabled son requeridos", HTTP_STATUS.BAD_REQUEST, "INVALID_BODY");
  }

  const supabase = createSupabaseServiceRoleClient() as any;
  const { data, error } = await supabase
    .from("regions")
    .update({ enabled: body.enabled })
    .eq("id", body.id)
    .select("*")
    .single();

  if (error || !data) {
    return apiError(
      error?.message ?? "Región no encontrada",
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "REGION_UPDATE_FAILED"
    );
  }

  return NextResponse.json({ region: data });
});
