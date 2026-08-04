import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase";
import { apiError, requireAuth, withErrorHandling, HTTP_STATUS } from "@/app/api/_shared";

/**
 * GET /api/users/me — devuelve la fila `users` (staff: asesor/admin/gerencia)
 * del usuario autenticado. Distinto de GET /api/customers/me (clientes) --
 * ver AccountMenu, que elige uno u otro según el `role` de la sesión.
 * PATCH /api/users/me — actualiza los campos editables (solo `full_name` por
 * ahora; email es la identidad de Supabase Auth y no se edita acá).
 */
export const GET = withErrorHandling(async () => {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  const supabase = createSupabaseServiceRoleClient() as any;
  const { data: staffUser, error } = await supabase
    .from("users")
    .select("id, email, role, full_name, phone")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (error) {
    return apiError(error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR, "USER_FETCH_FAILED");
  }
  if (!staffUser) {
    return apiError("Usuario no encontrado", HTTP_STATUS.NOT_FOUND, "USER_NOT_FOUND");
  }

  return NextResponse.json({ user: staffUser });
});

type UpdateBody = {
  fullName?: string;
  phone?: string;
};

export const PATCH = withErrorHandling(async (request: Request) => {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  const body = (await request.json().catch(() => null)) as UpdateBody | null;
  if (!body || typeof body !== "object") {
    return apiError("Invalid JSON body", HTTP_STATUS.BAD_REQUEST, "INVALID_BODY");
  }
  if (body.fullName !== undefined && !body.fullName.trim()) {
    return apiError("fullName no puede estar vacío", HTTP_STATUS.BAD_REQUEST, "INVALID_FULL_NAME");
  }

  const supabase = createSupabaseServiceRoleClient() as any;
  const update: Record<string, unknown> = {};
  if (body.fullName !== undefined) update.full_name = body.fullName.trim();
  if (body.phone !== undefined) update.phone = body.phone.trim() || null;

  if (Object.keys(update).length === 0) {
    return apiError("Nada para actualizar", HTTP_STATUS.BAD_REQUEST, "EMPTY_UPDATE");
  }

  const { data: updated, error } = await supabase
    .from("users")
    .update(update)
    .eq("id", auth.user.id)
    .select("id, email, role, full_name, phone")
    .single();

  if (error) {
    return apiError(error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR, "USER_UPDATE_FAILED");
  }

  return NextResponse.json({ user: updated });
});
