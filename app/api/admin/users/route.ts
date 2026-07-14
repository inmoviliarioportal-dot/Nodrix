import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase";
import { apiError, requireRole, withErrorHandling, HTTP_STATUS, type UserRole } from "@/app/api/_shared";
import { MVP_ORG_ID } from "@/app/api/auth/_constants";

type CreateUserBody = {
  email?: string;
  password?: string;
  fullName?: string;
  role?: string;
};

/** Qué roles puede crear cada rol creador. Cliente y asesor no pueden crear
 * usuarios en absoluto (bloqueados por `requireRole` más abajo). */
const CREATABLE_ROLES_BY_CREATOR: Record<string, UserRole[]> = {
  admin: ["asesor", "gerencia"],
  gerencia: ["asesor"],
};

/**
 * GET /api/admin/users?role=asesor
 *
 * Lista usuarios internos (staff) por rol -- usado para poblar el selector
 * de "Asignar asesor". Requiere admin/gerencia.
 */
export const GET = withErrorHandling(async (request: Request) => {
  const auth = await requireRole(["admin", "gerencia"]);
  if (!auth.authorized) return auth.response;

  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role");

  const supabase = createSupabaseServiceRoleClient() as any;
  let query = supabase.from("users").select("id, email, full_name, role").eq("org_id", MVP_ORG_ID);
  if (role) query = query.eq("role", role);

  const { data, error } = await query.order("full_name", { ascending: true });
  if (error) {
    return apiError(error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR, "USERS_FETCH_FAILED");
  }

  return NextResponse.json({ users: data ?? [] });
});

/**
 * POST /api/admin/users
 *
 * Body: { email, password, fullName, role }
 *
 * Crea un usuario interno (staff): usuario real de Supabase Auth + fila en
 * `public.users` con el rol indicado. Restricción de negocio: quién puede
 * crear qué rol --
 * - `gerencia` solo puede crear `asesor`.
 * - `admin` puede crear `asesor` o `gerencia` (no otro `admin`, no `cliente`).
 * Requiere sesión con rol admin/gerencia.
 */
export const POST = withErrorHandling(async (request: Request) => {
  const auth = await requireRole(["admin", "gerencia"]);
  if (!auth.authorized) return auth.response;

  const body = (await request.json().catch(() => null)) as CreateUserBody | null;
  if (!body?.email || !body?.password || !body?.fullName || !body?.role) {
    return apiError(
      "email, password, fullName y role son requeridos",
      HTTP_STATUS.BAD_REQUEST,
      "INVALID_BODY"
    );
  }

  const allowedRoles = CREATABLE_ROLES_BY_CREATOR[auth.role] ?? [];
  if (!allowedRoles.includes(body.role as UserRole)) {
    return apiError(
      `Tu rol (${auth.role}) no puede crear usuarios con rol "${body.role}". Roles permitidos: ${allowedRoles.join(", ")}`,
      HTTP_STATUS.FORBIDDEN,
      "ROLE_NOT_ALLOWED"
    );
  }
  if (body.password.length < 8) {
    return apiError("La contraseña debe tener al menos 8 caracteres", HTTP_STATUS.BAD_REQUEST, "PASSWORD_TOO_SHORT");
  }

  const supabase = createSupabaseServiceRoleClient() as any;

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true,
    user_metadata: { name: body.fullName },
  });

  if (createError || !created?.user) {
    return apiError(
      createError?.message ?? "No se pudo crear el usuario",
      HTTP_STATUS.BAD_REQUEST,
      "AUTH_CREATE_FAILED"
    );
  }

  const { data: userRow, error: insertError } = await supabase
    .from("users")
    .insert({
      id: created.user.id,
      org_id: MVP_ORG_ID,
      email: body.email,
      full_name: body.fullName,
      role: body.role,
    })
    .select()
    .single();

  if (insertError) {
    // Best-effort cleanup: no dejar un usuario de Auth huérfano sin fila en public.users.
    await supabase.auth.admin.deleteUser(created.user.id).catch(() => {});
    return apiError(insertError.message, HTTP_STATUS.INTERNAL_SERVER_ERROR, "USER_ROW_CREATE_FAILED");
  }

  return NextResponse.json({ user: userRow }, { status: 201 });
});
