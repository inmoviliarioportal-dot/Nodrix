import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests unitarios de enforcement en los Route Handlers del agente E3:
 *   (c) publicar sin simulated_at se rechaza.
 *   (d) publicar sin note se rechaza.
 *   (e) gerencia con permiso "edit" en "variables" puede guardar un
 *       borrador, pero recibe 403 al intentar publicar (límite de ROL fijo,
 *       no de permiso configurable).
 *
 * Se mockea `@/app/api/_shared` (solo `requirePermission`, el resto se deja
 * real vía `importActual`) y `@/lib/supabase/server` con un cliente fake
 * mínimo, siguiendo el mismo patrón de `tests/unit/wizard-variables.test.ts`.
 */

let mockAuthResult: any;
let wizardVariableSetsRow: Record<string, unknown> | null = null;
let rpcCalls: Array<{ fn: string; args: unknown }> = [];
let rpcResult: { data: unknown; error: unknown } = { data: null, error: null };
let auditInserts: unknown[] = [];

vi.mock("@/app/api/_shared", async () => {
  const actual = await vi.importActual<typeof import("../../app/api/_shared")>("../../app/api/_shared");
  return {
    ...actual,
    requirePermission: vi.fn(async () => mockAuthResult),
  };
});

function makeFakeClient() {
  return {
    from: vi.fn((table: string) => ({
      select: vi.fn(() => {
        const builder: any = {
          eq: vi.fn(() => builder),
          order: vi.fn(() => builder),
          limit: vi.fn(() => builder),
          maybeSingle: vi.fn(async () => {
            if (table === "wizard_variable_sets") return { data: wizardVariableSetsRow, error: null };
            return { data: null, error: null };
          }),
        };
        return builder;
      }),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(async () => ({ data: { ...wizardVariableSetsRow, ...{} }, error: null })),
          })),
        })),
      })),
      insert: vi.fn((row: unknown) => {
        if (table === "audit_events") {
          auditInserts.push(row);
          return Promise.resolve({ data: null, error: null });
        }
        return {
          select: vi.fn(() => ({
            single: vi.fn(async () => ({
              data: { id: "new-draft-id", version: 1, status: "draft", ...(row as object) },
              error: null,
            })),
          })),
        };
      }),
    })),
    rpc: vi.fn(async (fn: string, args: unknown) => {
      rpcCalls.push({ fn, args });
      return rpcResult;
    }),
  };
}

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServiceRoleClient: () => makeFakeClient(),
}));

import { POST as publishHandler } from "../../app/api/admin/wizard-variables/[version]/publish/route";
import { POST as draftHandler } from "../../app/api/admin/wizard-variables/draft/route";
import { DEFAULT_VARIABLE_SET } from "../../lib/wizard-variables";

const ORG_ID = "00000000-0000-0000-0000-000000000001";
const FAKE_USER = { id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" };

function validDraftBody() {
  return {
    loanTerms: DEFAULT_VARIABLE_SET.loanTerms,
    qualification: DEFAULT_VARIABLE_SET.qualification,
    bankingParams: DEFAULT_VARIABLE_SET.bankingParams,
    probabilities: DEFAULT_VARIABLE_SET.probabilities,
    assumptions: DEFAULT_VARIABLE_SET.assumptions,
  };
}

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "22222222-2222-2222-2222-222222222222",
    org_id: ORG_ID,
    version: 2,
    status: "draft",
    note: null,
    simulated_at: "2026-08-01T00:00:00.000Z",
    created_by: FAKE_USER.id,
    created_at: "2026-07-30T00:00:00.000Z",
    loan_terms: DEFAULT_VARIABLE_SET.loanTerms,
    qualification: DEFAULT_VARIABLE_SET.qualification,
    banking_params: DEFAULT_VARIABLE_SET.bankingParams,
    probabilities: DEFAULT_VARIABLE_SET.probabilities,
    assumptions: DEFAULT_VARIABLE_SET.assumptions,
    ...overrides,
  };
}

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/admin/wizard-variables/2/publish", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  wizardVariableSetsRow = null;
  rpcCalls = [];
  rpcResult = { data: { ...makeRow(), status: "active" }, error: null };
  auditInserts = [];
});

describe("POST /api/admin/wizard-variables/[version]/publish", () => {
  it("(c) rechaza publicar una versión sin simulated_at", async () => {
    mockAuthResult = { authorized: true, user: FAKE_USER, role: "admin" };
    wizardVariableSetsRow = makeRow({ simulated_at: null });

    const response = await publishHandler(makeRequest({ note: "Cambio de tramos" }), {
      params: Promise.resolve({ version: "2" }),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.code).toBe("NOT_SIMULATED");
    expect(rpcCalls.length).toBe(0);
  });

  it("(d) rechaza publicar sin note", async () => {
    mockAuthResult = { authorized: true, user: FAKE_USER, role: "admin" };
    wizardVariableSetsRow = makeRow();

    const response = await publishHandler(makeRequest({}), {
      params: Promise.resolve({ version: "2" }),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.code).toBe("NOTE_REQUIRED");
    expect(rpcCalls.length).toBe(0);
  });

  it("(e) gerencia con permiso edit recibe 403 al intentar publicar (límite de rol fijo)", async () => {
    mockAuthResult = { authorized: true, user: FAKE_USER, role: "gerencia" };
    wizardVariableSetsRow = makeRow();

    const response = await publishHandler(makeRequest({ note: "Cambio de tramos" }), {
      params: Promise.resolve({ version: "2" }),
    });

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.code).toBe("PUBLISH_REQUIRES_ADMIN_ROLE");
    expect(rpcCalls.length).toBe(0);
  });

  it("admin con simulated_at y note publica correctamente (invoca el RPC transaccional)", async () => {
    mockAuthResult = { authorized: true, user: FAKE_USER, role: "admin" };
    wizardVariableSetsRow = makeRow();

    const response = await publishHandler(makeRequest({ note: "Cambio de tramos" }), {
      params: Promise.resolve({ version: "2" }),
    });

    expect(response.status).toBe(200);
    expect(rpcCalls.length).toBe(1);
    expect(rpcCalls[0].fn).toBe("publish_wizard_variable_set");
    expect(auditInserts.length).toBe(1);
    expect((auditInserts[0] as any).action).toBe("wizard_variables_published");
  });
});

describe("POST /api/admin/wizard-variables/draft", () => {
  it("(e) gerencia con permiso edit SÍ puede guardar un borrador", async () => {
    mockAuthResult = {
      authorized: true,
      user: FAKE_USER,
      role: "gerencia",
      permissions: { variables: "edit" },
    };
    // Sin borrador existente ni versiones previas -> crea version 1.
    wizardVariableSetsRow = null;

    const response = await draftHandler(makeRequest(validDraftBody()) as any);

    expect(response.status).toBe(201);
  });
});
