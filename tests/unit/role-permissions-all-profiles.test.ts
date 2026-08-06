import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests del agente G3 (permisos configurables por perfil):
 *   (a) `admin` devuelve todo en "edit" AUNQUE exista una fila de override
 *       para admin en la base — no configurable, sin excepciones.
 *   (b) `asesor` CON override guardado usa el override, no el default.
 *   (c) `asesor` SIN override cae al default de BUILTIN_ROLE_PERMISSIONS.
 *   (d) el endpoint rechaza guardar permisos para `admin`
 *       (400 ADMIN_NOT_CONFIGURABLE) y no escribe nada.
 *
 * Se mockea `@/lib/supabase` con un cliente en memoria mínimo (el helper
 * compartido `_helpers/fake-supabase` no soporta `.upsert().select().single()`
 * ni `.in()`, que es lo que usa esta ruta) y `@/app/api/_shared` solo para
 * `requireRole`, dejando el resto real vía `importActual`.
 */

const MVP_ORG_ID = "00000000-0000-0000-0000-000000000001";

type Row = Record<string, any>;

let rolePermissionRows: Row[] = [];
let auditInserts: Row[] = [];
let mockAuthResult: any;

vi.mock("@/app/api/_shared", async () => {
  const actual = await vi.importActual<typeof import("../../app/api/_shared")>("../../app/api/_shared");
  return { ...actual, requireRole: vi.fn(async () => mockAuthResult) };
});

function makeFakeClient() {
  return {
    from(tableName: string) {
      return {
        select(_cols?: string) {
          let rows = tableName === "role_permissions" ? [...rolePermissionRows] : [];
          const chain: any = {
            eq(col: string, val: unknown) {
              rows = rows.filter((r) => r[col] === val);
              return chain;
            },
            in(col: string, vals: unknown[]) {
              rows = rows.filter((r) => vals.includes(r[col]));
              return chain;
            },
            maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
            single: async () => ({ data: rows[0] ?? null, error: rows[0] ? null : { message: "not found" } }),
            then: (onOk: any, onErr: any) => Promise.resolve({ data: rows, error: null }).then(onOk, onErr),
          };
          return chain;
        },
        insert(payload: Row) {
          if (tableName === "audit_events") auditInserts.push(payload);
          return Promise.resolve({ data: null, error: null });
        },
        upsert(payload: Row) {
          const existing = rolePermissionRows.find(
            (r) => r.org_id === payload.org_id && r.role === payload.role
          );
          const row = existing ?? { id: `row-${payload.role}` };
          Object.assign(row, payload);
          if (!existing) rolePermissionRows.push(row);
          return {
            select: (_cols?: string) => ({ single: async () => ({ data: row, error: null }) }),
          };
        },
      };
    },
  };
}

vi.mock("@/lib/supabase", () => ({ createSupabaseServiceRoleClient: () => makeFakeClient() }));

beforeEach(() => {
  rolePermissionRows = [];
  auditInserts = [];
  mockAuthResult = { authorized: true, user: { id: "admin-user-id", role: "admin" } };
});

describe("getEffectivePermissions — admin nunca es configurable", () => {
  it("(a) admin devuelve todo en 'edit' aunque exista una fila de override para admin", async () => {
    const { getEffectivePermissions, PERMISSION_MODULES } = await import("../../lib/permissions");

    // Fila insertada "a mano" en la base, saltándose el CHECK de la migración.
    rolePermissionRows.push({
      id: "hand-inserted",
      org_id: MVP_ORG_ID,
      role: "admin",
      permissions: Object.fromEntries(PERMISSION_MODULES.map((m) => [m, "none"])),
    });

    const perms = await getEffectivePermissions("admin", null);
    for (const module of PERMISSION_MODULES) {
      expect(perms[module]).toBe("edit");
    }
  });
});

describe("getEffectivePermissions — perfil asesor configurable", () => {
  it("(b) asesor con override guardado usa el override y no el default", async () => {
    const { getEffectivePermissions, BUILTIN_ROLE_PERMISSIONS } = await import("../../lib/permissions");

    rolePermissionRows.push({
      id: "r1",
      org_id: MVP_ORG_ID,
      role: "asesor",
      permissions: { visitas: "view", propiedades: "edit" },
    });

    const perms = await getEffectivePermissions("asesor", null);
    expect(perms.visitas).toBe("view");
    expect(perms.propiedades).toBe("edit");
    // El default de asesor tiene bandeja en "edit"; el override no la incluye,
    // así que queda en "none" — se usa el override completo, no un merge.
    expect(BUILTIN_ROLE_PERMISSIONS.asesor.bandeja).toBe("edit");
    expect(perms.bandeja).toBe("none");
  });

  it("(c) asesor sin override cae al default de BUILTIN_ROLE_PERMISSIONS", async () => {
    const { getEffectivePermissions, BUILTIN_ROLE_PERMISSIONS } = await import("../../lib/permissions");
    const perms = await getEffectivePermissions("asesor", null);
    expect(perms).toEqual(BUILTIN_ROLE_PERMISSIONS.asesor);
  });

  it("gerencia sigue leyendo su override guardado", async () => {
    const { getEffectivePermissions } = await import("../../lib/permissions");
    rolePermissionRows.push({
      id: "r2",
      org_id: MVP_ORG_ID,
      role: "gerencia",
      permissions: { kpis: "view" },
    });
    const perms = await getEffectivePermissions("gerencia", null);
    expect(perms.kpis).toBe("view");
    expect(perms.usuarios).toBe("none");
  });
});

describe("PUT /api/admin/role-permissions", () => {
  it("(d) rechaza guardar permisos para admin con ADMIN_NOT_CONFIGURABLE y no escribe nada", async () => {
    const { PUT } = await import("../../app/api/admin/role-permissions/route");

    const res = await PUT(
      new Request("http://localhost/api/admin/role-permissions", {
        method: "PUT",
        body: JSON.stringify({ role: "admin", permissions: { kpis: "none" } }),
      }) as any);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code ?? json.error?.code).toBe("ADMIN_NOT_CONFIGURABLE");
    expect(rolePermissionRows).toHaveLength(0);
    expect(auditInserts).toHaveLength(0);
  });

  it("rechaza un rol inexistente con INVALID_ROLE", async () => {
    const { PUT } = await import("../../app/api/admin/role-permissions/route");
    const res = await PUT(
      new Request("http://localhost/api/admin/role-permissions", {
        method: "PUT",
        body: JSON.stringify({ role: "supervisor", permissions: {} }),
      }) as any);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code ?? json.error?.code).toBe("INVALID_ROLE");
    expect(rolePermissionRows).toHaveLength(0);
  });

  it("guarda permisos de asesor y registra el cambio en audit_events", async () => {
    const { PUT } = await import("../../app/api/admin/role-permissions/route");
    const res = await PUT(
      new Request("http://localhost/api/admin/role-permissions", {
        method: "PUT",
        body: JSON.stringify({ role: "asesor", permissions: { visitas: "view" } }),
      }) as any);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.role).toBe("asesor");
    expect(json.configurable).toBe(true);
    expect(json.permissions.visitas).toBe("view");
    expect(rolePermissionRows).toHaveLength(1);
    expect(auditInserts).toHaveLength(1);
    expect(auditInserts[0].action).toBe("update_role_permissions");
    expect(auditInserts[0].actor_user_id).toBe("admin-user-id");
  });
});

describe("GET /api/admin/role-permissions", () => {
  it("lista todos los perfiles, con admin marcado como no configurable", async () => {
    const { GET } = await import("../../app/api/admin/role-permissions/route");
    const res = await GET(new Request("http://localhost/api/admin/role-permissions") as any);
    const json = await res.json();

    expect(json.roles.map((r: any) => r.role)).toEqual(["asesor", "gerencia", "admin"]);
    const admin = json.roles.find((r: any) => r.role === "admin");
    expect(admin.configurable).toBe(false);
    expect(admin.permissions.usuarios).toBe("edit");
    expect(json.roles.every((r: any) => r.role === "admin" || r.configurable)).toBe(true);
  });

  it("devuelve un perfil puntual con ?role=asesor", async () => {
    const { GET } = await import("../../app/api/admin/role-permissions/route");
    rolePermissionRows.push({ id: "r3", org_id: MVP_ORG_ID, role: "asesor", permissions: { visitas: "edit" } });
    const res = await GET(
      new Request("http://localhost/api/admin/role-permissions?role=asesor") as any);
    const json = await res.json();
    expect(json.role).toBe("asesor");
    expect(json.hasOverride).toBe(true);
    expect(json.permissions.visitas).toBe("edit");
  });
});
