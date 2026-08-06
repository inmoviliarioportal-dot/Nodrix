import { createSupabaseServiceRoleClient } from "@/lib/supabase";
import type { PermissionLevel, PermissionMap, PermissionModule } from "@/lib/permissions";
// `NAV_ITEMS` en vez de `PERMISSION_MODULES` de lib/permissions a propósito:
// permissions.ts importa ESTE módulo (aplica los grants al final de
// `getEffectivePermissions`), así que un import de valor de vuelta crearía un
// ciclo. Los tipos sí se importan de ahí porque los imports de tipo se borran
// en compilación. Es la misma fuente: PERMISSION_MODULES = NAV_ITEMS.map(key).
import { NAV_ITEMS } from "@/lib/nav-registry";

const PERMISSION_KEYS: readonly string[] = NAV_ITEMS.map((item) => item.key);

/**
 * PERMISOS TEMPORALES POR USUARIO (tabla `user_permission_grants`,
 * migración 037).
 *
 * REGLA: los grants SOLO AGREGAN acceso, nunca lo quitan. El mapa del perfil
 * (rol fijo o rol personalizado) es el piso mínimo garantizado; un grant
 * puede elevar `none -> view`, `none -> edit` o `view -> edit`, y nunca
 * bajar nada. Al vencer, el usuario vuelve exactamente a su perfil.
 */

/** org_id fijo del MVP — mismo valor que MVP_ORG_ID en
 * app/api/auth/_constants.ts; se repite acá para no crear una dependencia
 * circular entre lib/ y app/api/_shared (mismo criterio que lib/permissions.ts). */
const MVP_ORG_ID = "00000000-0000-0000-0000-000000000001";

export type TemporaryGrant = {
  id: string;
  userId: string;
  permissionKey: PermissionModule;
  level: Exclude<PermissionLevel, "none">;
  grantedBy: string;
  reason: string;
  startsAt: string;
  expiresAt: string;
  revokedAt: string | null;
};

/** Orden total de los niveles. Es lo que hace que "elevar" sea un simple
 * máximo y que la operación sea idempotente y conmutativa. */
const LEVEL_RANK: Record<PermissionLevel, number> = { none: 0, view: 1, edit: 2 };

function isPermissionModule(key: unknown): key is PermissionModule {
  return typeof key === "string" && PERMISSION_KEYS.includes(key);
}

type GrantRow = {
  id: string;
  user_id: string;
  permission_key: string;
  level: string;
  granted_by: string;
  reason: string;
  starts_at: string;
  expires_at: string;
  revoked_at: string | null;
};

function mapRow(row: GrantRow): TemporaryGrant | null {
  if (!isPermissionModule(row.permission_key)) return null; // clave huérfana (item borrado del menú)
  if (row.level !== "view" && row.level !== "edit") return null;
  return {
    id: row.id,
    userId: row.user_id,
    permissionKey: row.permission_key,
    level: row.level,
    grantedBy: row.granted_by,
    reason: row.reason,
    startsAt: row.starts_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
  };
}

/**
 * Grants VIGENTES de un usuario: no revocados, ya iniciados y NO vencidos.
 *
 * DECISIÓN DE DISEÑO DELIBERADA: el vencimiento se evalúa acá, comparando
 * `expires_at` contra el momento actual dentro de la propia consulta. No hay
 * job de limpieza ni columna `is_active` mantenida por un proceso: un permiso
 * vencido deja de aplicar por construcción, aunque ningún proceso de limpieza
 * haya corrido nunca. Las filas vencidas se conservan como historial.
 *
 * Es UNA sola consulta y devuelve `[]` ante cualquier error, para que un
 * problema leyendo permisos extra nunca deje al usuario sin los de su perfil.
 */
export async function getActiveGrantsForUser(userId: string): Promise<TemporaryGrant[]> {
  const nowIso = new Date().toISOString();
  const supabase = createSupabaseServiceRoleClient() as any;

  const { data, error } = await supabase
    .from("user_permission_grants")
    .select("id, user_id, permission_key, level, granted_by, reason, starts_at, expires_at, revoked_at")
    .eq("org_id", MVP_ORG_ID)
    .eq("user_id", userId)
    .is("revoked_at", null)
    .lte("starts_at", nowIso)
    .gt("expires_at", nowIso);

  if (error || !data) return [];
  return (data as GrantRow[]).map(mapRow).filter((g): g is TemporaryGrant => g !== null);
}

/**
 * FUNCIÓN PURA — combina el mapa base del perfil con una lista de grants
 * aplicando SOLO ELEVACIÓN: para cada grant, el nivel resultante es el MAYOR
 * entre el del perfil y el del grant (none < view < edit). Nunca baja nada.
 *
 * Es pura a propósito: toda la regla de negocio se puede testear sin base de
 * datos. El filtrado de vigencia (vencidos/revocados) ocurre en
 * `getActiveGrantsForUser`; por robustez, esta función igual descarta grants
 * revocados o vencidos si le llegan.
 */
export function applyGrantsToPermissionMap(
  base: PermissionMap,
  grants: readonly TemporaryGrant[],
  now: Date = new Date()
): PermissionMap {
  const result: PermissionMap = { ...base };

  for (const grant of grants) {
    if (grant.revokedAt) continue;
    if (new Date(grant.expiresAt).getTime() <= now.getTime()) continue;
    if (new Date(grant.startsAt).getTime() > now.getTime()) continue;
    if (!isPermissionModule(grant.permissionKey)) continue;

    const current = result[grant.permissionKey];
    if (LEVEL_RANK[grant.level] > LEVEL_RANK[current]) {
      result[grant.permissionKey] = grant.level;
    }
  }

  return result;
}

export type CreateGrantInput = {
  userId: string;
  permissionKey: PermissionModule;
  level: Exclude<PermissionLevel, "none">;
  reason: string;
  expiresAt: string;
  startsAt?: string;
  grantedBy: string;
};

export type GrantMutationResult =
  | { ok: true; grant: TemporaryGrant }
  | { ok: false; error: string };

/** Otorga un grant temporal y lo deja registrado en `audit_events`
 * (`permission_grant_created`): quién lo dio, a quién, qué permiso, con qué
 * nivel, hasta cuándo y por qué. */
export async function createGrant(input: CreateGrantInput): Promise<GrantMutationResult> {
  const supabase = createSupabaseServiceRoleClient() as any;
  const startsAt = input.startsAt ?? new Date().toISOString();

  const { data, error } = await supabase
    .from("user_permission_grants")
    .insert({
      org_id: MVP_ORG_ID,
      user_id: input.userId,
      permission_key: input.permissionKey,
      level: input.level,
      granted_by: input.grantedBy,
      reason: input.reason,
      starts_at: startsAt,
      expires_at: input.expiresAt,
    })
    .select("id, user_id, permission_key, level, granted_by, reason, starts_at, expires_at, revoked_at")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "No se pudo crear el permiso temporal" };

  const grant = mapRow(data as GrantRow);
  if (!grant) return { ok: false, error: "El permiso creado quedó en un estado inválido" };

  await supabase.from("audit_events").insert({
    org_id: MVP_ORG_ID,
    entity_type: "user_permission_grant",
    entity_id: grant.id,
    action: "permission_grant_created",
    actor_user_id: input.grantedBy,
    after: {
      target_user_id: grant.userId,
      permission_key: grant.permissionKey,
      level: grant.level,
      starts_at: grant.startsAt,
      expires_at: grant.expiresAt,
      reason: grant.reason,
    },
  });

  return { ok: true, grant };
}

/** Revoca un grant antes de su vencimiento SIN borrar la fila (historial), y
 * lo registra en `audit_events` (`permission_grant_revoked`). */
export async function revokeGrant(
  grantId: string,
  revokedBy: string,
  reason?: string
): Promise<GrantMutationResult> {
  const supabase = createSupabaseServiceRoleClient() as any;
  const revokedAt = new Date().toISOString();

  const { data, error } = await supabase
    .from("user_permission_grants")
    .update({ revoked_at: revokedAt, revoked_by: revokedBy })
    .eq("id", grantId)
    .eq("org_id", MVP_ORG_ID)
    .is("revoked_at", null)
    .select("id, user_id, permission_key, level, granted_by, reason, starts_at, expires_at, revoked_at")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "El permiso temporal no existe o ya fue revocado" };

  const grant = mapRow(data as GrantRow);
  if (!grant) return { ok: false, error: "El permiso revocado quedó en un estado inválido" };

  await supabase.from("audit_events").insert({
    org_id: MVP_ORG_ID,
    entity_type: "user_permission_grant",
    entity_id: grant.id,
    action: "permission_grant_revoked",
    actor_user_id: revokedBy,
    before: {
      target_user_id: grant.userId,
      permission_key: grant.permissionKey,
      level: grant.level,
      expires_at: grant.expiresAt,
    },
    after: { revoked_at: revokedAt, revoke_reason: reason ?? null },
  });

  return { ok: true, grant };
}
