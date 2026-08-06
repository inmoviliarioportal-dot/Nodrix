import { describe, it, expect } from "vitest";

import { applyGrantsToPermissionMap, type TemporaryGrant } from "@/lib/temporary-grants";
import { PERMISSION_MODULES, type PermissionMap, type PermissionModule } from "@/lib/permissions";

/**
 * Tests de la REGLA DE NEGOCIO central de los permisos temporales: solo
 * ELEVAN el mapa del perfil, nunca lo bajan. `applyGrantsToPermissionMap` es
 * pura a propósito para poder verificarlo sin base de datos.
 */

const NOW = new Date("2026-08-05T12:00:00.000Z");
const FUTURE = "2026-09-01T12:00:00.000Z";
const PAST = "2026-07-01T12:00:00.000Z";

function baseMap(overrides: Partial<PermissionMap> = {}): PermissionMap {
  const map = Object.fromEntries(PERMISSION_MODULES.map((m) => [m, "none"])) as PermissionMap;
  return { ...map, ...overrides };
}

function grant(partial: Partial<TemporaryGrant> & { permissionKey: PermissionModule }): TemporaryGrant {
  return {
    id: "grant-1",
    userId: "user-1",
    level: "edit",
    grantedBy: "admin-1",
    reason: "Cobertura de vacaciones",
    startsAt: PAST,
    expiresAt: FUTURE,
    revokedAt: null,
    ...partial,
  };
}

describe("applyGrantsToPermissionMap — solo eleva, nunca restringe", () => {
  it("(a) un grant 'edit' sobre un perfil con 'none' da 'edit'", () => {
    const result = applyGrantsToPermissionMap(
      baseMap(),
      [grant({ permissionKey: "reportes", level: "edit" })],
      NOW
    );
    expect(result.reportes).toBe("edit");
  });

  it("eleva de 'view' a 'edit'", () => {
    const result = applyGrantsToPermissionMap(
      baseMap({ reportes: "view" }),
      [grant({ permissionKey: "reportes", level: "edit" })],
      NOW
    );
    expect(result.reportes).toBe("edit");
  });

  it("(b) un grant 'view' sobre un perfil que ya tiene 'edit' deja 'edit' (NUNCA baja)", () => {
    const result = applyGrantsToPermissionMap(
      baseMap({ usuarios: "edit" }),
      [grant({ permissionKey: "usuarios", level: "view" })],
      NOW
    );
    expect(result.usuarios).toBe("edit");
  });

  it("(c) un grant vencido no aplica", () => {
    const result = applyGrantsToPermissionMap(
      baseMap(),
      [grant({ permissionKey: "variables", level: "edit", expiresAt: PAST })],
      NOW
    );
    expect(result.variables).toBe("none");
  });

  it("(d) un grant revocado no aplica", () => {
    const result = applyGrantsToPermissionMap(
      baseMap(),
      [grant({ permissionKey: "variables", level: "edit", revokedAt: "2026-08-01T00:00:00.000Z" })],
      NOW
    );
    expect(result.variables).toBe("none");
  });

  it("un grant que todavía no empieza no aplica", () => {
    const result = applyGrantsToPermissionMap(
      baseMap(),
      [grant({ permissionKey: "visitas", level: "edit", startsAt: FUTURE, expiresAt: "2026-10-01T00:00:00.000Z" })],
      NOW
    );
    expect(result.visitas).toBe("none");
  });

  it("(e) sin grants, el mapa queda idéntico al del perfil", () => {
    const profile = baseMap({ bandeja: "edit", visitas: "view" });
    expect(applyGrantsToPermissionMap(profile, [], NOW)).toEqual(profile);
  });

  it("no muta el mapa base ni toca las claves no otorgadas", () => {
    const profile = baseMap({ bandeja: "view" });
    const snapshot = { ...profile };
    const result = applyGrantsToPermissionMap(
      profile,
      [grant({ permissionKey: "kpis", level: "edit" })],
      NOW
    );
    expect(profile).toEqual(snapshot);
    expect(result.bandeja).toBe("view");
    expect(result.kpis).toBe("edit");
  });

  it("con varios grants sobre la misma clave gana el mayor, sin importar el orden", () => {
    const grants = [
      grant({ id: "g1", permissionKey: "propiedades", level: "edit" }),
      grant({ id: "g2", permissionKey: "propiedades", level: "view" }),
    ];
    expect(applyGrantsToPermissionMap(baseMap(), grants, NOW).propiedades).toBe("edit");
    expect(applyGrantsToPermissionMap(baseMap(), [...grants].reverse(), NOW).propiedades).toBe("edit");
  });

  it("ignora claves de permiso que ya no existen en el registro", () => {
    const rogue = { ...grant({ permissionKey: "kpis" }), permissionKey: "modulo_borrado" } as unknown as TemporaryGrant;
    const profile = baseMap();
    expect(applyGrantsToPermissionMap(profile, [rogue], NOW)).toEqual(profile);
  });
});
