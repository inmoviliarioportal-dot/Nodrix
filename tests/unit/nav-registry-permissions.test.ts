import { describe, it, expect } from "vitest";

import {
  NAV_REGISTRY,
  NAV_ITEMS,
  flattenNavRegistry,
  landingHrefForRole,
  type NavItemDef,
} from "@/lib/nav-registry";
import {
  PERMISSION_MODULES,
  PERMISSION_MODULE_LABELS,
  BUILTIN_ROLE_PERMISSIONS,
  normalizePermissionMap,
  hasPermission,
} from "@/lib/permissions";

/**
 * El objetivo de estos tests es blindar la propiedad central del refactor:
 * NAV_REGISTRY es la ÚNICA fuente de verdad, y la matriz de permisos se
 * deriva de ella automáticamente. Si alguien vuelve a declarar módulos a
 * mano, estos tests lo detectan.
 */
describe("nav-registry como fuente única de permisos", () => {
  const EXPECTED_KEYS = [
    "kpis",
    "reportes",
    "bandeja",
    "asignaciones",
    "visitas",
    "propiedades",
    "regiones",
    "usuarios",
    "variables",
  ];

  it("PERMISSION_MODULES contiene exactamente las 9 claves nuevas", () => {
    expect([...PERMISSION_MODULES].sort()).toEqual([...EXPECTED_KEYS].sort());
    expect(PERMISSION_MODULES).toHaveLength(9);
  });

  it("elimina los módulos fantasma `documentos` y `scoring`", () => {
    // Ninguno era consultado por un guard: no protegían nada y ensuciaban la
    // matriz haciéndole creer al admin que restringían algo.
    expect(PERMISSION_MODULES).not.toContain("documentos");
    expect(PERMISSION_MODULES).not.toContain("scoring");
    expect(PERMISSION_MODULE_LABELS).not.toHaveProperty("documentos");
    expect(PERMISSION_MODULE_LABELS).not.toHaveProperty("scoring");
  });

  it("las claves de permiso son únicas en todo el registro", () => {
    const keys = NAV_ITEMS.map((item) => item.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("cada módulo tiene su etiqueta derivada de permissionLabel", () => {
    for (const item of NAV_ITEMS) {
      expect(PERMISSION_MODULE_LABELS[item.key]).toBe(item.permissionLabel);
    }
    expect(Object.keys(PERMISSION_MODULE_LABELS)).toHaveLength(PERMISSION_MODULES.length);
  });

  it("/admin/roles NO está en el registro (admin-only fijo, no configurable)", () => {
    // Dejarlo configurable sería escalada de privilegios: es la pantalla donde
    // se configuran los permisos de todos, incluidos los de quien la abre.
    // El cast a string es necesario porque el registro es `as const`: los
    // tipos literales YA garantizan que "/admin/roles" no está, y sin el cast
    // TypeScript rechaza la comparación por no haber solapamiento. Se deja
    // igual como prueba en runtime, por si el registro deja de ser `as const`.
    const hrefs: string[] = NAV_ITEMS.map((item) => item.href)
    expect(hrefs.includes("/admin/roles")).toBe(false);
  });

  it("agregar un item al registro lo agrega a los módulos automáticamente", () => {
    // Se prueba sobre un registro de PRUEBA, sin mutar el real.
    // `items` mutable a propósito acá: el registro real es readonly (`as
    // const`), pero esta prueba necesita agregarle un item para demostrar que
    // la derivación lo recoge sola.
    const testRegistry: { label: string; iconKey: string; items: NavItemDef[] }[] = [
      {
        label: "Grupo",
        iconKey: "chart",
        items: [
          {
            key: "existente",
            href: "/x",
            label: "X",
            iconKey: "chart",
            permissionLabel: "Existente",
          },
        ],
      },
    ];
    expect(flattenNavRegistry(testRegistry).map((i) => i.key)).toEqual(["existente"]);

    testRegistry[0].items.push({
      key: "vista_nueva",
      href: "/y",
      label: "Y",
      iconKey: "chart",
      permissionLabel: "Vista Nueva",
    });

    // Sin tocar ninguna otra lista, la clave nueva ya está derivada.
    const derivedModules = flattenNavRegistry(testRegistry).map((i) => i.key);
    const derivedLabels = Object.fromEntries(
      flattenNavRegistry(testRegistry).map((i) => [i.key, i.permissionLabel])
    );
    expect(derivedModules).toContain("vista_nueva");
    expect(derivedLabels.vista_nueva).toBe("Vista Nueva");
  });
});

describe("normalizePermissionMap: migración en caliente de mapas viejos", () => {
  it("hereda las claves nuevas desde las viejas que cubrían varias vistas", () => {
    const legacy = { reportes: "edit", usuarios: "view", propiedades: "edit" };
    const result = normalizePermissionMap(legacy);

    // Claves viejas conservan su valor (ahora significan solo su vista).
    expect(result.reportes).toBe("edit");
    expect(result.usuarios).toBe("view");
    expect(result.propiedades).toBe("edit");

    // Claves nuevas heredan el nivel de la vieja que las cubría.
    expect(result.kpis).toBe("edit");
    expect(result.asignaciones).toBe("view");
    expect(result.regiones).toBe("edit");

    // Lo no mencionado sigue en "none".
    expect(result.bandeja).toBe("none");
    expect(result.variables).toBe("none");
  });

  it("no pisa una clave nueva ya configurada explícitamente", () => {
    const alreadyMigrated = { reportes: "edit", kpis: "none", usuarios: "edit", asignaciones: "view" };
    const result = normalizePermissionMap(alreadyMigrated);
    expect(result.kpis).toBe("none");
    expect(result.asignaciones).toBe("view");
  });

  it("ignora claves desconocidas y valores inválidos", () => {
    const result = normalizePermissionMap({ documentos: "edit", scoring: "edit", bandeja: "banana" });
    expect(result).not.toHaveProperty("documentos");
    expect(result).not.toHaveProperty("scoring");
    expect(result.bandeja).toBe("none");
  });

  it("un mapa vacío o basura produce todo en none", () => {
    for (const input of [null, undefined, {}, 42, "x"]) {
      const result = normalizePermissionMap(input);
      expect(Object.keys(result)).toHaveLength(PERMISSION_MODULES.length);
      expect(Object.values(result).every((v) => v === "none")).toBe(true);
    }
  });
});

describe("BUILTIN_ROLE_PERMISSIONS", () => {
  it("asesor mantiene su acceso histórico: sin usuarios NI asignaciones", () => {
    // El viejo `usuarios: "none"` cubría Mantenedor + Asignar asesor, así que
    // hay que negar ambas claves nuevas para no ampliarle el acceso.
    const asesor = BUILTIN_ROLE_PERMISSIONS.asesor;
    expect(hasPermission(asesor, "usuarios", "view")).toBe(false);
    expect(hasPermission(asesor, "asignaciones", "view")).toBe(false);
    // El resto sigue en edit.
    for (const module of PERMISSION_MODULES) {
      if (module === "usuarios" || module === "asignaciones") continue;
      expect(asesor[module]).toBe("edit");
    }
  });

  it("cliente no tiene nada; admin y gerencia tienen todo", () => {
    for (const module of PERMISSION_MODULES) {
      expect(BUILTIN_ROLE_PERMISSIONS.cliente[module]).toBe("none");
      expect(BUILTIN_ROLE_PERMISSIONS.admin[module]).toBe("edit");
      expect(BUILTIN_ROLE_PERMISSIONS.gerencia[module]).toBe("edit");
    }
  });
});

describe("NAV_REGISTRY reproduce el menú admin actual", () => {
  it("mantiene los 5 grupos y sus hrefs en orden", () => {
    expect(NAV_REGISTRY.map((g) => g.label)).toEqual([
      "Dashboard",
      "Asesor",
      "Propiedades",
      "Usuarios",
      "Flujo",
    ]);
    expect(NAV_ITEMS.map((i) => i.href)).toEqual([
      "/admin/dashboard",
      "/admin/reports",
      "/backoffice/queue",
      "/admin/assignments",
      "/backoffice/visits",
      "/admin/properties",
      "/admin/regions",
      "/admin/users",
      "/admin/variables",
    ]);
  });
});

describe("landingHrefForRole: el logo lleva a cada rol a SU panel", () => {
  it("el cliente sigue yendo a su portal", () => {
    expect(landingHrefForRole("cliente", BUILTIN_ROLE_PERMISSIONS.cliente)).toBe("/dashboard");
  });

  it("sin sesión (rol nulo) cae al portal cliente", () => {
    expect(landingHrefForRole(null)).toBe("/dashboard");
    expect(landingHrefForRole(undefined)).toBe("/dashboard");
  });

  it("el asesor va a su bandeja, NO al panel del cliente", () => {
    expect(landingHrefForRole("asesor", BUILTIN_ROLE_PERMISSIONS.asesor)).toBe("/backoffice/queue");
  });

  it("admin y gerencia van al dashboard ejecutivo", () => {
    expect(landingHrefForRole("admin", BUILTIN_ROLE_PERMISSIONS.admin)).toBe("/admin/dashboard");
    expect(landingHrefForRole("gerencia", BUILTIN_ROLE_PERMISSIONS.gerencia)).toBe("/admin/dashboard");
  });

  // El motivo de que la función sea consciente de permisos:
  // `requirePermissionPage` redirige a /dashboard cuando falta el permiso,
  // así que mandar a un perfil sin "kpis" al dashboard ejecutivo lo dejaría
  // rebotando justo al panel de cliente que este cambio busca evitar.
  it("un perfil sin KPIs no es enviado a una vista que lo rebotaría", () => {
    const sinKpis = { ...BUILTIN_ROLE_PERMISSIONS.gerencia, kpis: "none" as const };
    expect(landingHrefForRole("gerencia", sinKpis)).toBe("/backoffice/queue");
  });

  it("un rol personalizado aterriza en la primera vista que sí puede ver", () => {
    const soloPropiedades = { ...BUILTIN_ROLE_PERMISSIONS.cliente, propiedades: "view" as const };
    expect(landingHrefForRole("custom", soloPropiedades)).toBe("/admin/properties");
  });

  it("staff sin ninguna vista habilitada no queda en una ruta prohibida", () => {
    expect(landingHrefForRole("gerencia", BUILTIN_ROLE_PERMISSIONS.cliente)).toBe("/dashboard");
  });

  it("sin mapa de permisos conserva el destino histórico del login", () => {
    expect(landingHrefForRole("asesor")).toBe("/backoffice/queue");
    expect(landingHrefForRole("admin")).toBe("/admin/dashboard");
  });
});
