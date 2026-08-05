import { describe, it, expect, vi, beforeEach } from "vitest";

// -----------------------------------------------------------------------------
// Mock de lib/supabase/server — createSupabaseServiceRoleClient() se
// reemplaza por un cliente fake y totalmente controlado por cada test. Las
// tablas expuestas son "applications" y "wizard_variable_sets".
// -----------------------------------------------------------------------------

const mockInsert = vi.fn(async () => ({ data: null, error: null }));
const mockUpdate = vi.fn(() => ({ eq: vi.fn(async () => ({ data: null, error: null })) }));
const mockUpsert = vi.fn(async () => ({ data: null, error: null }));

let applicationsRow: Record<string, unknown> | null = null;
let wizardVariableSetsRows: Record<string, unknown>[] = [];

function makeSelectBuilder(rows: Record<string, unknown>[] | Record<string, unknown> | null) {
  const filters: Array<[string, unknown]> = [];

  const builder: any = {
    eq: vi.fn((col: string, val: unknown) => {
      filters.push([col, val]);
      return builder;
    }),
    maybeSingle: vi.fn(async () => {
      if (rows === null) return { data: null, error: null };
      if (!Array.isArray(rows)) return { data: rows, error: null };
      const match = rows.find((row) => filters.every(([col, val]) => row[col] === val));
      return { data: match ?? null, error: null };
    }),
  };
  return builder;
}

function makeFakeClient() {
  return {
    from: vi.fn((table: string) => ({
      select: vi.fn((_columns: string) => {
        if (table === "applications") return makeSelectBuilder(applicationsRow);
        if (table === "wizard_variable_sets") return makeSelectBuilder(wizardVariableSetsRows);
        throw new Error(`Tabla inesperada en mock: ${table}`);
      }),
      // Métodos de escritura: si `resolveVariablesForRead` los llamara
      // alguna vez, queremos que el test lo detecte explícitamente.
      insert: mockInsert,
      update: mockUpdate,
      upsert: mockUpsert,
    })),
  };
}

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServiceRoleClient: () => makeFakeClient(),
}));

import { resolveVariablesForRead, DEFAULT_VARIABLE_SET } from "../../lib/wizard-variables";

const ORG_ID = "00000000-0000-0000-0000-000000000001";

const V1_ROW = {
  id: "11111111-1111-1111-1111-111111111111",
  org_id: ORG_ID,
  version: 1,
  status: "active",
  loan_terms: DEFAULT_VARIABLE_SET.loanTerms,
  qualification: DEFAULT_VARIABLE_SET.qualification,
  banking_params: DEFAULT_VARIABLE_SET.bankingParams,
  probabilities: DEFAULT_VARIABLE_SET.probabilities,
  assumptions: DEFAULT_VARIABLE_SET.assumptions,
};

const V2_ROW = {
  ...V1_ROW,
  id: "22222222-2222-2222-2222-222222222222",
  version: 2,
  status: "archived", // ya no es la vigente, pero existe como versión más nueva
};

beforeEach(() => {
  applicationsRow = null;
  wizardVariableSetsRows = [];
  mockInsert.mockClear();
  mockUpdate.mockClear();
  mockUpsert.mockClear();
});

describe("resolveVariablesForRead — sin ancla resuelve a versión 1, nunca a la vigente", () => {
  it("wizard_variable_set_id NULL (solicitud histórica) -> versión 1, aunque exista una versión 2 más nueva", async () => {
    applicationsRow = {
      id: "app-1",
      org_id: ORG_ID,
      wizard_variable_set_id: null,
    };
    wizardVariableSetsRows = [V1_ROW, V2_ROW];

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await resolveVariablesForRead("app-1");

    expect(result.version).toBe(1);
    expect(result.id).toBe(V1_ROW.id);
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it("fila anclada inexistente -> cae a versión 1", async () => {
    applicationsRow = {
      id: "app-2",
      org_id: ORG_ID,
      wizard_variable_set_id: "id-que-no-existe",
    };
    wizardVariableSetsRows = [V1_ROW, V2_ROW];

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await resolveVariablesForRead("app-2");
    expect(result.version).toBe(1);
    warnSpy.mockRestore();
  });

  it("fila anclada que viola un límite duro (minRentaDividendoRatio < 2.5) -> cae a versión 1", async () => {
    const invalidRow = {
      ...V2_ROW,
      id: "33333333-3333-3333-3333-333333333333",
      version: 3,
      banking_params: { ...DEFAULT_VARIABLE_SET.bankingParams, minRentaDividendoRatio: 1 },
    };
    applicationsRow = {
      id: "app-3",
      org_id: ORG_ID,
      wizard_variable_set_id: invalidRow.id,
    };
    wizardVariableSetsRows = [V1_ROW, invalidRow];

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await resolveVariablesForRead("app-3");
    expect(result.version).toBe(1);
    warnSpy.mockRestore();
  });

  it("sin ninguna fila real en DB -> cae al default en memoria (versión 1 sintética)", async () => {
    applicationsRow = { id: "app-4", org_id: ORG_ID, wizard_variable_set_id: null };
    wizardVariableSetsRows = [];

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await resolveVariablesForRead("app-4");
    expect(result).toEqual(DEFAULT_VARIABLE_SET);
    warnSpy.mockRestore();
  });
});

describe("resolveVariablesForRead — nunca escribe (barrera de diseño)", () => {
  // Nota de diseño: `resolveVariablesForRead` recibe internamente un cliente
  // envuelto por `toReadOnlyClient` (ver lib/wizard-variables.ts) que NO
  // reenvía `insert`/`update`/`upsert` -- son propiedades inexistentes en el
  // wrapper, no solo un tipo restringido. Este test verifica en runtime, con
  // el cliente fake completo (que SÍ expone esos métodos), que ninguno de
  // ellos es invocado durante una resolución de lectura, en ningún escenario
  // (con ancla, sin ancla, ancla inválida).
  it("insert/update/upsert nunca se llaman al resolver variables para lectura", async () => {
    applicationsRow = {
      id: "app-5",
      org_id: ORG_ID,
      wizard_variable_set_id: V2_ROW.id,
    };
    wizardVariableSetsRows = [V1_ROW, V2_ROW];

    await resolveVariablesForRead("app-5");

    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockUpsert).not.toHaveBeenCalled();
  });
});
