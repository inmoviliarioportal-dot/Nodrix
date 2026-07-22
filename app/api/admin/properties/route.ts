import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase";
import { apiError, requireRole, withErrorHandling, HTTP_STATUS } from "@/app/api/_shared";
import { MVP_ORG_ID } from "@/app/api/auth/_constants";

const VALID_PURPOSES = ["inversion", "vivienda_propia", "ambos"] as const;

/**
 * GET /api/admin/properties — lista el inventario completo (disponible o
 * no) para el panel de administración. Requiere admin/gerencia.
 * POST /api/admin/properties — crea una propiedad.
 */
export const GET = withErrorHandling(async () => {
  const auth = await requireRole(["admin", "gerencia"]);
  if (!auth.authorized) return auth.response;

  const supabase = createSupabaseServiceRoleClient() as any;
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("org_id", MVP_ORG_ID)
    .order("comuna", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    return apiError(error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR, "PROPERTIES_FETCH_FAILED");
  }

  return NextResponse.json({ properties: data ?? [] });
});

type PropertyBody = {
  name?: string;
  comuna?: string;
  location?: string;
  priceUf?: number;
  purpose?: string;
  available?: boolean;
  images?: string[];
  floorPlanUrl?: string | null;
  videoUrl?: string | null;
};

function validate(body: PropertyBody): string | null {
  if (!body.name?.trim()) return "name es requerido";
  if (!body.comuna?.trim()) return "comuna es requerida";
  if (typeof body.priceUf !== "number" || body.priceUf <= 0) return "priceUf debe ser un número positivo";
  if (body.purpose && !VALID_PURPOSES.includes(body.purpose as (typeof VALID_PURPOSES)[number])) {
    return `purpose inválido. Valores permitidos: ${VALID_PURPOSES.join(", ")}`;
  }
  return null;
}

export const POST = withErrorHandling(async (request: Request) => {
  const auth = await requireRole(["admin", "gerencia"]);
  if (!auth.authorized) return auth.response;

  const body = (await request.json().catch(() => null)) as PropertyBody | null;
  if (!body) return apiError("Body inválido", HTTP_STATUS.BAD_REQUEST, "INVALID_BODY");

  const validationError = validate(body);
  if (validationError) return apiError(validationError, HTTP_STATUS.BAD_REQUEST, "INVALID_PROPERTY");

  const supabase = createSupabaseServiceRoleClient() as any;
  const { data, error } = await supabase
    .from("properties")
    .insert({
      org_id: MVP_ORG_ID,
      name: body.name!.trim(),
      comuna: body.comuna!.trim(),
      location: body.location?.trim() || body.comuna!.trim(),
      price_uf: body.priceUf,
      purpose: body.purpose ?? "ambos",
      available: body.available ?? true,
      images: body.images ?? [],
      floor_plan_url: body.floorPlanUrl ?? null,
      video_url: body.videoUrl ?? null,
    })
    .select("*")
    .single();

  if (error) {
    return apiError(error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR, "PROPERTY_CREATE_FAILED");
  }

  return NextResponse.json({ property: data }, { status: 201 });
});
