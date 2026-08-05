/**
 * Suite de inmutabilidad — demuestra de punta a punta que el mecanismo de
 * anclaje de `wizard_variable_sets` (lib/wizard-variables.ts +
 * app/api/leads/route.ts + app/api/applications/[id]/update-financial-profile
 * + app/api/applications/[id]/proposal-bands) funciona: una solicitud ya
 * calculada NUNCA cambia de resultado porque se publique una versión nueva
 * de las variables del wizard.
 *
 * A propósito, estos tests NO llaman a `pinActiveVariables`/
 * `resolveVariablesForRead` directamente en la mayoría de los casos -- pasan
 * por los Route Handlers reales (`POST /api/leads`,
 * `POST /api/applications/[id]/update-financial-profile`,
 * `GET /api/applications/[id]/proposal-bands`) contra un Supabase falso en
 * memoria (tests/unit/_helpers/fake-supabase.ts). Así, si alguien revierte
 * el anclaje en esos endpoints (borra la llamada a `pinActiveVariables`),
 * estos tests fallan -- un test que llamara al mecanismo por su cuenta no lo
 * detectaría.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  makeEmptyDb,
  makeFakeSupabaseClient,
  seedRow,
  type FakeDb,
} from "./_helpers/fake-supabase";

// -----------------------------------------------------------------------------
// Mocks compartidos -- un único punto de acceso a "Supabase" para todo el
// mecanismo bajo prueba: `lib/wizard-variables.ts`, los Route Handlers de
// leads/update-financial-profile/proposal-bands y sus dependencias
// (lib/leads.ts, lib/stage-machine.ts, lib/notifications.ts, lib/scoring.ts)
// pasan todas por `createSupabaseServiceRoleClient`/`createSupabaseServerClient`
// de "@/lib/supabase/server".
// -----------------------------------------------------------------------------

let db: FakeDb = makeEmptyDb();
let authEmail: string | null = null;

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServiceRoleClient: () => makeFakeSupabaseClient(db),
  createSupabaseServerClient: async () => ({
    auth: {
      getUser: async () => {
        if (!authEmail) {
          return { data: { user: null }, error: { message: "no session" } };
        }
        return {
          data: { user: { id: `auth-${authEmail}`, email: authEmail } },
          error: null,
        };
      },
    },
  }),
}));

// Notificaciones por email: best-effort en el código real, pero no queremos
// que estos tests intenten hablar con un SMTP real (Mailpit local puede no
// estar corriendo en CI).
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(async () => true),
}));

import { POST as postLead } from "../../app/api/leads/route";
import { POST as postUpdateFinancialProfile } from "../../app/api/applications/[id]/update-financial-profile/route";
import { GET as getProposalBands } from "../../app/api/applications/[id]/proposal-bands/route";
import { resolveVariablesForRead, DEFAULT_VARIABLE_SET } from "../../lib/wizard-variables";
import { calculateUFPreEvaluation } from "../../lib/uf-preevaluation";

const ORG_ID = "00000000-0000-0000-0000-000000000001"; // MVP_ORG_ID

// -----------------------------------------------------------------------------
// Fixtures de wizard_variable_sets
// -----------------------------------------------------------------------------

function v1Columns() {
  return {
    loan_terms: DEFAULT_VARIABLE_SET.loanTerms,
    qualification: DEFAULT_VARIABLE_SET.qualification,
    banking_params: DEFAULT_VARIABLE_SET.bankingParams,
    probabilities: DEFAULT_VARIABLE_SET.probabilities,
    assumptions: DEFAULT_VARIABLE_SET.assumptions,
  };
}

/** Publica la versión 1 (activa) para la org -- estado inicial del mundo. */
function seedV1Active(database: FakeDb) {
  return seedRow(database, "wizard_variable_sets", {
    org_id: ORG_ID,
    version: 1,
    status: "active",
    ...v1Columns(),
  });
}

/**
 * Publica una versión 2 "más restrictiva" (tasa de interés anual más alta
 * -> menor UF máxima aprobada para el mismo ingreso) y archiva la que antes
 * estaba activa -- replica lo que hace un admin real desde Release 3.
 */
function publishMoreRestrictiveVersion(database: FakeDb, version: number) {
  const activeRow = database.wizard_variable_sets.find((r) => r.status === "active");
  if (activeRow) activeRow.status = "archived";

  return seedRow(database, "wizard_variable_sets", {
    org_id: ORG_ID,
    version,
    status: "active",
    loan_terms: DEFAULT_VARIABLE_SET.loanTerms,
    qualification: DEFAULT_VARIABLE_SET.qualification,
    banking_params: DEFAULT_VARIABLE_SET.bankingParams,
    probabilities: DEFAULT_VARIABLE_SET.probabilities,
    assumptions: { annualInterestRate: 0.09 }, // v1 usa 0.045 -> mucho más restrictiva
  });
}

const FULL_FINANCIAL_PROFILE = {
  monthlySalary: 2_500_000,
  savingsAmount: 8_000_000,
  employmentType: "indefinido" as const,
  employmentYears: 5,
  hasExistingDebt: false,
  totalDebtBalance: 0,
  investmentType: "inversion",
  propertyDestination: "alquiler_tradicional",
  propertyStatus: "usado",
};

function leadBody(email: string) {
  return {
    name: "Cliente Test",
    email,
    ...FULL_FINANCIAL_PROFILE,
  };
}

function postLeadRequest(body: unknown) {
  return postLead(
    new Request("http://localhost/api/leads", {
      method: "POST",
      body: JSON.stringify(body),
    })
  );
}

function getProposalBandsRequest(applicationId: string) {
  return getProposalBands(new Request(`http://localhost/api/applications/${applicationId}/proposal-bands`), {
    params: Promise.resolve({ id: applicationId }),
  });
}

function postUpdateFinancialProfileRequest(applicationId: string, body: unknown) {
  return postUpdateFinancialProfile(
    new Request(`http://localhost/api/applications/${applicationId}/update-financial-profile`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: applicationId }) }
  );
}

beforeEach(() => {
  db = makeEmptyDb();
  authEmail = null;
});

// =============================================================================
// 1 + 2 + 3 — flujo completo: v1 vigente, se publica v2, el cliente ya
// calculado sigue viendo su número, el asesor ve lo mismo (y la versión
// resuelta es v1), y un cliente NUEVO tras publicar v2 obtiene v2.
// =============================================================================

describe("Inmutabilidad end-to-end: cliente bajo v1 no se mueve cuando se publica v2", () => {
  it("caso 1+2+3: mismo UF para el cliente antiguo (dashboard y backoffice), UF distinto para un cliente nuevo tras v2", async () => {
    seedV1Active(db);

    // --- Cliente 1 se registra y calcula bajo v1 ---
    authEmail = null; // POST /api/leads no requiere sesión
    const res1 = await postLeadRequest(leadBody("cliente1@test.cl"));
    expect(res1.status).toBe(201);
    const body1 = await res1.json();
    const application1Id: string = body1.application.id;

    // Verifica que quedó anclado (si alguien borra la llamada a
    // `pinActiveVariables` en app/api/leads/route.ts, esto es null y el
    // test falla acá).
    const app1Row = db.applications.find((a) => a.id === application1Id);
    expect(app1Row?.wizard_variable_set_id).toBeTruthy();
    const v1RowId = db.wizard_variable_sets.find((r) => r.version === 1)!.id;
    expect(app1Row?.wizard_variable_set_id).toBe(v1RowId);

    // "Panel del cliente" -- primera lectura, bajo v1.
    authEmail = "cliente1@test.cl";
    const panelRes1 = await getProposalBandsRequest(application1Id);
    expect(panelRes1.status).toBe(200);
    const panelBody1 = await panelRes1.json();
    const ufBajoV1 = panelBody1.ufPreEvaluation.estimatedPropertyValueUF;
    expect(typeof ufBajoV1).toBe("number");

    // --- Se publica v2, más restrictiva ---
    publishMoreRestrictiveVersion(db, 2);

    // Caso 1: el panel del cliente 1 sigue mostrando el mismo UF.
    const panelRes1Again = await getProposalBandsRequest(application1Id);
    const panelBody1Again = await panelRes1Again.json();
    expect(panelBody1Again.ufPreEvaluation.estimatedPropertyValueUF).toBe(ufBajoV1);

    // Caso 2: el asesor abre la misma solicitud en el backoffice (mismo
    // endpoint de lectura) -- ve el mismo UF, y la versión resuelta
    // internamente sigue siendo v1 (la "indicación de que está calculada
    // bajo v1").
    authEmail = "asesor@test.cl"; // cualquier sesión autenticada puede leer en este endpoint
    const backofficeRes = await getProposalBandsRequest(application1Id);
    const backofficeBody = await backofficeRes.json();
    expect(backofficeBody.ufPreEvaluation.estimatedPropertyValueUF).toBe(ufBajoV1);

    const resolvedForApp1 = await resolveVariablesForRead(application1Id);
    expect(resolvedForApp1.version).toBe(1);

    // Caso 3: un cliente NUEVO que se registra DESPUÉS de publicar v2 debe
    // obtener el resultado de v2 (distinto, y más restrictivo).
    authEmail = null;
    const res2 = await postLeadRequest(leadBody("cliente2@test.cl"));
    expect(res2.status).toBe(201);
    const body2 = await res2.json();
    const application2Id: string = body2.application.id;

    const app2Row = db.applications.find((a) => a.id === application2Id);
    const v2RowId = db.wizard_variable_sets.find((r) => r.version === 2)!.id;
    expect(app2Row?.wizard_variable_set_id).toBe(v2RowId);

    authEmail = "cliente2@test.cl";
    const panelRes2 = await getProposalBandsRequest(application2Id);
    const panelBody2 = await panelRes2.json();
    const ufBajoV2 = panelBody2.ufPreEvaluation.estimatedPropertyValueUF;

    expect(ufBajoV2).not.toBe(ufBajoV1);
    // v2 tiene una tasa de interés mayor -> el crédito máximo aprobado baja.
    expect(ufBajoV2).toBeLessThan(ufBajoV1);

    const resolvedForApp2 = await resolveVariablesForRead(application2Id);
    expect(resolvedForApp2.version).toBe(2);
  });
});

// =============================================================================
// 4 — el cliente edita su renta: recalcula bajo v2, el ancla pasa a v2, y la
// respuesta trae previousVariableVersion/newVariableVersion (parte de
// backend del caso 4 -- la explicación visual del cambio es del agente F5,
// que corre en paralelo sobre archivos de UI fuera del scope de este agente).
// =============================================================================

describe("Caso 4: editar el perfil financiero re-ancla la solicitud a la versión vigente", () => {
  it("recalcula bajo v2, mueve el ancla de v1 a v2 y expone previousVariableVersion/newVariableVersion", async () => {
    seedV1Active(db);

    authEmail = null;
    const created = await postLeadRequest(leadBody("cliente-edita@test.cl"));
    const createdBody = await created.json();
    const applicationId: string = createdBody.application.id;

    const v1RowId = db.wizard_variable_sets.find((r) => r.version === 1)!.id;
    expect(db.applications.find((a) => a.id === applicationId)?.wizard_variable_set_id).toBe(v1RowId);

    // Se publica v2 ANTES de que el cliente edite su renta.
    publishMoreRestrictiveVersion(db, 2);
    const v2RowId = db.wizard_variable_sets.find((r) => r.version === 2)!.id;

    authEmail = "cliente-edita@test.cl";
    const updateRes = await postUpdateFinancialProfileRequest(applicationId, {
      ...FULL_FINANCIAL_PROFILE,
      monthlySalary: 3_200_000, // "edita su renta"
    });
    expect(updateRes.status).toBe(200);
    const updateBody = await updateRes.json();

    // El endpoint expone explícitamente qué versión regía antes y cuál
    // rige ahora -- si se borra la llamada a `pinActiveVariables` en
    // app/api/applications/[id]/update-financial-profile/route.ts, estos
    // dos campos vuelven a ser `null`/`null` y el test falla acá.
    expect(updateBody.previousVariableVersion).toBe(1);
    expect(updateBody.newVariableVersion).toBe(2);

    // El ancla en la base de datos efectivamente se movió a v2.
    const appRowAfter = db.applications.find((a) => a.id === applicationId);
    expect(appRowAfter?.wizard_variable_set_id).toBe(v2RowId);
    expect(appRowAfter?.wizard_variable_set_id).not.toBe(v1RowId);

    const resolved = await resolveVariablesForRead(applicationId);
    expect(resolved.version).toBe(2);
  });
});

// =============================================================================
// 5 — revertir a v1 (nueva fila 'active' que replica v1) no afecta a un
// cliente ya anclado a v2.
// =============================================================================

describe("Caso 5: revertir la versión vigente no mueve solicitudes ya ancladas a la versión que se reemplaza", () => {
  it("cliente anclado a v2 no cambia cuando se publica v3 (idéntica a v1) como vigente", async () => {
    seedV1Active(db);
    publishMoreRestrictiveVersion(db, 2);
    const v2Row = db.wizard_variable_sets.find((r) => r.version === 2)!;

    authEmail = null;
    const created = await postLeadRequest(leadBody("cliente-v2@test.cl"));
    const createdBody = await created.json();
    const applicationId: string = createdBody.application.id;
    expect(db.applications.find((a) => a.id === applicationId)?.wizard_variable_set_id).toBe(v2Row.id);

    authEmail = "cliente-v2@test.cl";
    const panelBefore = await getProposalBandsRequest(applicationId);
    const panelBeforeBody = await panelBefore.json();
    const ufAntesDeRevertir = panelBeforeBody.ufPreEvaluation.estimatedPropertyValueUF;

    // "Se revierte a v1": nueva fila activa (v3) que replica exactamente
    // los parámetros de v1 -- v2 queda archivada, pero su fila (y el
    // anclaje del cliente) siguen existiendo intactos.
    const activeRow = db.wizard_variable_sets.find((r) => r.status === "active");
    if (activeRow) activeRow.status = "archived";
    seedRow(db, "wizard_variable_sets", {
      org_id: ORG_ID,
      version: 3,
      status: "active",
      ...v1Columns(),
    });

    const appRowAfterRevert = db.applications.find((a) => a.id === applicationId);
    expect(appRowAfterRevert?.wizard_variable_set_id).toBe(v2Row.id); // sin cambios

    const resolvedAfterRevert = await resolveVariablesForRead(applicationId);
    expect(resolvedAfterRevert.version).toBe(2);
    expect(resolvedAfterRevert.id).toBe(v2Row.id);

    const panelAfter = await getProposalBandsRequest(applicationId);
    const panelAfterBody = await panelAfter.json();
    expect(panelAfterBody.ufPreEvaluation.estimatedPropertyValueUF).toBe(ufAntesDeRevertir);
  });
});

// =============================================================================
// 6 — leer una solicitud muchas veces por todas las rutas de lectura NUNCA
// mueve el ancla. Este es el caso más importante: la función de lectura no
// puede escribir bajo ninguna circunstancia.
// =============================================================================

describe("Caso 6 (el más importante): leer nunca ancla", () => {
  it("múltiples lecturas por todas las rutas de lectura no cambian wizard_variable_set_id ni una sola vez", async () => {
    seedV1Active(db);

    authEmail = null;
    const created = await postLeadRequest(leadBody("cliente-solo-lectura@test.cl"));
    const createdBody = await created.json();
    const applicationId: string = createdBody.application.id;

    const anchorAfterCreation = db.applications.find((a) => a.id === applicationId)?.wizard_variable_set_id;
    expect(anchorAfterCreation).toBeTruthy();

    // Se publica v2 en medio de las lecturas -- si `resolveVariablesForRead`
    // (o cualquier ruta de lectura) alguna vez re-anclara "para estar al
    // día", el ancla cambiaría a v2 acá.
    authEmail = "cliente-solo-lectura@test.cl";
    for (let i = 0; i < 3; i++) {
      await getProposalBandsRequest(applicationId);
      await resolveVariablesForRead(applicationId);
      expect(db.applications.find((a) => a.id === applicationId)?.wizard_variable_set_id).toBe(
        anchorAfterCreation
      );
    }

    publishMoreRestrictiveVersion(db, 2);

    for (let i = 0; i < 5; i++) {
      await getProposalBandsRequest(applicationId);
      await resolveVariablesForRead(applicationId);
      expect(db.applications.find((a) => a.id === applicationId)?.wizard_variable_set_id).toBe(
        anchorAfterCreation
      );
    }

    // Barrera de diseño en sí misma (ver tests/unit/wizard-variables.test.ts):
    // `resolveVariablesForRead` no tiene acceso a insert/update/upsert. Acá
    // se reconfirma a nivel de comportamiento observable end-to-end: el
    // valor final en la "base de datos" es exactamente el mismo que
    // inmediatamente después de crear la solicitud.
    expect(db.applications.find((a) => a.id === applicationId)?.wizard_variable_set_id).toBe(
      anchorAfterCreation
    );
  });
});

// =============================================================================
// 7 — solicitud histórica (sin wizard_variable_set_id, previa a este
// mecanismo) resuelve a v1 y da EXACTAMENTE el mismo número que el código
// legado (hardcodeado) daba antes de que este mecanismo existiera.
// =============================================================================

describe("Caso 7: solicitud histórica sin ancla resuelve a v1 y reproduce el número pre-mecanismo", () => {
  it("wizard_variable_set_id NULL -> mismo resultado numérico que calculateUFPreEvaluation sin config (legado)", async () => {
    // v1 real en DB, y además ya se publicó v2 -- una solicitud histórica no
    // debe verse afectada por ninguna de las dos, debe caer siempre a v1.
    seedV1Active(db);
    publishMoreRestrictiveVersion(db, 2);

    const historicalCustomer = seedRow(db, "customers", {
      org_id: ORG_ID,
      rut_hash: "hash",
      rut_ciphertext: null,
      name: "Cliente Histórico",
      email: "historico@test.cl",
      phone: null,
      investment_type: "inversion",
      property_destination: "alquiler_tradicional",
      monthly_income: 2_500_000,
      professional_level: "profesional",
    });
    const historicalApplication = seedRow(db, "applications", {
      org_id: ORG_ID,
      customer_id: historicalCustomer.id,
      stage: "SCORING_COMPLETADO",
      scoring_category: "PLATA",
      scoring_score: 70,
      savings_amount: 8_000_000,
      total_debt_balance: 0,
      income_sources: null,
      wizard_variable_set_id: null, // <- histórica, previa a este mecanismo
    });

    const resolved = await resolveVariablesForRead(historicalApplication.id);
    expect(resolved.version).toBe(1);

    const legacyResult = calculateUFPreEvaluation({
      monthlySalaryCLP: 2_500_000,
      totalDebtBalanceCLP: 0,
      savingsAmountCLP: 8_000_000,
    }); // sin config -> usa los hardcodeados originales (pre-mecanismo)

    const resolvedResult = calculateUFPreEvaluation(
      {
        monthlySalaryCLP: 2_500_000,
        totalDebtBalanceCLP: 0,
        savingsAmountCLP: 8_000_000,
      },
      {
        qualification: resolved.qualification,
        bankingParams: resolved.bankingParams,
        assumptions: resolved.assumptions,
        loanTerms: { fallbackYears: resolved.loanTerms.fallbackYears },
      }
    );

    expect(resolvedResult).toEqual(legacyResult);

    // Y a través del endpoint real de lectura también, punta a punta.
    authEmail = "historico@test.cl";
    const res = await getProposalBandsRequest(historicalApplication.id);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ufPreEvaluation).toEqual(legacyResult);

    // La lectura tampoco debe haber anclado la solicitud histórica.
    expect(db.applications.find((a) => a.id === historicalApplication.id)?.wizard_variable_set_id).toBeNull();
  });
});
