import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase";
import { apiError, requireRole, withErrorHandling, HTTP_STATUS, type UserRole } from "@/app/api/_shared";
import { MVP_ORG_ID } from "@/app/api/auth/_constants";
import { isValidRut, cleanRut } from "@/lib/rut";

type CreateUserBody = {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  rut?: string;
  phone?: string;
  role?: string;
  customRoleId?: string;
};

/** Qué roles puede crear cada rol creador. Cliente y asesor no pueden crear
 * usuarios en absoluto (bloqueados por `requireRole` más abajo). Solo admin
 * puede asignar roles personalizados ("custom"). */
const CREATABLE_ROLES_BY_CREATOR: Record<string, UserRole[]> = {
  admin: ["asesor", "gerencia", "custom"],
  gerencia: ["asesor"],
};

/**
 * GET /api/admin/users?role=asesor
 *
 * Lista usuarios internos (staff). Con `?role=` filtra por ese rol exacto
 * (usado para poblar el selector de "Asignar asesor"). Sin filtro, devuelve
 * solo los roles que el creador puede GESTIONAR (mismo set que puede crear,
 * ver `CREATABLE_ROLES_BY_CREATOR`) -- así el mantenedor de usuarios
 * (app/admin/users/page.tsx) nunca expone cuentas admin a gerencia, ni
 * permite a nadie deshabilitar cuentas fuera de su alcance. Requiere
 * admin/gerencia.
 */
export const GET = withErrorHandling(async (request: Request) => {
  const auth = await requireRole(["admin", "gerencia"]);
  if (!auth.authorized) return auth.response;

  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role");

  const supabase = createSupabaseServiceRoleClient() as any;
  let query = supabase
    .from("users")
    .select("id, email, first_name, last_name, full_name, rut, phone, role, active, created_at")
    .eq("org_id", MVP_ORG_ID);

  if (role) {
    query = query.eq("role", role);
  } else {
    const manageableRoles = CREATABLE_ROLES_BY_CREATOR[auth.role] ?? [];
    query = query.in("role", manageableRoles);
  }

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
  if (!body?.email || !body?.password || !body?.firstName || !body?.lastName || !body?.rut || !body?.role) {
    return apiError(
      "email, password, firstName, lastName, rut y role son requeridos",
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
  if (!isValidRut(body.rut)) {
    return apiError("El RUT ingresado no es válido", HTTP_STATUS.BAD_REQUEST, "INVALID_RUT");
  }

  const supabase = createSupabaseServiceRoleClient() as any;

  const normalizedRut = cleanRut(body.rut);
  const { data: existingRut } = await supabase
    .from("users")
    .select("id")
    .eq("org_id", MVP_ORG_ID)
    .eq("rut", normalizedRut)
    .maybeSingle();
  if (existingRut) {
    return apiError("Ya existe un usuario con ese RUT", HTTP_STATUS.CONFLICT, "RUT_ALREADY_EXISTS");
  }

  if (body.role === "custom") {
    if (!body.customRoleId) {
      return apiError("customRoleId es requerido para role='custom'", HTTP_STATUS.BAD_REQUEST, "MISSING_CUSTOM_ROLE");
    }
    const { data: customRole } = await supabase
      .from("custom_roles")
      .select("id")
      .eq("id", body.customRoleId)
      .eq("org_id", MVP_ORG_ID)
      .maybeSingle();
    if (!customRole) {
      return apiError("customRoleId no corresponde a un rol válido", HTTP_STATUS.BAD_REQUEST, "INVALID_CUSTOM_ROLE");
    }
  }

  const fullName = `${body.firstName.trim()} ${body.lastName.trim()}`.trim();

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true,
    user_metadata: { name: fullName },
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
      first_name: body.firstName.trim(),
      last_name: body.lastName.trim(),
      full_name: fullName,
      rut: normalizedRut,
      phone: body.phone?.trim() || null,
      role: body.role,
      custom_role_id: body.role === "custom" ? body.customRoleId : null,
      active: true,
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
