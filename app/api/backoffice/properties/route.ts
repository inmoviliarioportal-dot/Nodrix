import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase";
import { apiError, requireRole, withErrorHandling, HTTP_STATUS } from "@/app/api/_shared";
import { MVP_ORG_ID } from "@/app/api/auth/_constants";

/**
 * GET /api/backoffice/properties — listado DE SOLO LECTURA del inventario
 * completo de propiedades para el asesor (y admin/gerencia). A diferencia
 * de GET /api/admin/properties (que exige admin/gerencia porque además
 * permite crear/editar/eliminar desde ese panel), este endpoint es
 * de solo consulta: el asesor necesita ver el detalle completo de cada
 * propiedad (dirección, comuna, UF, ubicación, N° de depto, fotos, video)
 * para buscar/filtrar/navegar, pero no puede modificar nada -- ver
 * app/backoffice/properties/page.tsx.
 */
export const GET = withErrorHandling(async () => {
  const auth = await requireRole(["asesor", "admin", "gerencia"]);
  if (!auth.authorized) return auth.response;

  const supabase = createSupabaseServiceRoleClient() as any;
  const { data, error } = await supabase
    .from("properties")
    .select(
      "id, name, comuna, location, unit_number, price_uf, purpose, bedrooms, bathrooms, property_type, available, images, floor_plan_url, video_url, target_destinations, amenities, created_at"
    )
    .eq("org_id", MVP_ORG_ID)
    .order("comuna", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    return apiError(error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR, "PROPERTIES_FETCH_FAILED");
  }

  return NextResponse.json({ properties: data ?? [] });
});
