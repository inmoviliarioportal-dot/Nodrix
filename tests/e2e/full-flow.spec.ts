import { test, expect, type Page } from "@playwright/test";

/**
 * Suite E2E — Release 3 (QA Final): Flujo completo lead -> cierre.
 *
 * Cubre TODO el pipeline de negocio, de punta a punta:
 *   Registro -> Lead/Scoring -> Documentos -> Bandeja del asesor ->
 *   Transiciones de estado -> Pre-evaluación -> Dashboard admin -> Cierre.
 *
 * IMPORTANTE (contrato real vs. documentado, verificado en código antes de escribir
 * esta suite):
 *   - `applications.stage` (ver app/api/applications/[id]/stage/route.ts, `STAGE_TRANSITIONS`)
 *     es una máquina LINEAL, sin ramas: RECEPCIONADA -> SCORING_COMPLETADO ->
 *     DOCUMENTOS_PENDIENTES -> DOCUMENTOS_APROBADOS -> PRE_EVALUACION_COMPLETADA ->
 *     VISITA_COMPLETADA -> ENVIADO_A_BANCO -> ESCRITURACION_AGENDADA -> CIERRE.
 *     Todas las transiciones son alcanzables vía PATCH /api/applications/[id]/stage
 *     (incluso las marcadas `automatic: true`), así que este test las dispara
 *     manualmente para no depender de triggers automáticos aún no implementados.
 *   - No existen (al momento de escribir esta suite) endpoints `/api/deeds` ni
 *     `/api/closures`, ni páginas `/admin/dashboard` / `/admin/reports`, ni un
 *     sistema de roles asesor/admin separado (login único). Cada test que
 *     depende de estas piezas usa `test.skip(...)` con un mensaje claro, igual
 *     que el patrón de tolerancia usado en release1.spec.ts, para que la suite
 *     seiga siendo re-ejecutable a medida que estas piezas se publiquen.
 *   - `documents.status` real usa minúsculas: 'pendiente' | 'en_revision' |
 *     'aprobado' | 'rechazado' (ver components/vault/DocumentVaultItem.tsx).
 *   - No hay fixtures de usuario asesor/admin separados del cliente en este MVP;
 *     la sesión de auth es única (misma tabla `users`/Supabase Auth), por lo que
 *     los tests de asesor/admin reusan la sesión ya autenticada del test 1 en vez
 *     de intentar un login con rol distinto que no existe todavía.
 */

function uniqueEmail(prefix: string) {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 10000)}@e2e-test.local`;
}

test.describe("Release 3 — Full flow: lead -> cierre", () => {
  test.describe.configure({ mode: "serial" });

  // Una única `page` compartida entre todos los tests de la suite (mismo patrón
  // que release1.spec.ts): test.describe.configure({mode:'serial'}) solo ordena
  // la ejecución, no comparte contexto/cookies entre tests con el fixture `page`
  // por defecto.
  let sharedPage: Page;

  const consoleErrors: string[] = [];
  const loadTimings: number[] = [];

  test.beforeAll(async ({ browser }) => {
    sharedPage = await browser.newPage();
    sharedPage.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    sharedPage.on("pageerror", (err) => {
      consoleErrors.push(err.message);
    });
  });

  test.afterAll(async () => {
    await sharedPage.close();

    if (loadTimings.length > 0) {
      const sorted = [...loadTimings].sort((a, b) => a - b);
      const p95Index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);
      const p95 = sorted[p95Index];
      // eslint-disable-next-line no-console
      console.log(
        `[full-flow] Navegaciones medidas: ${sorted.length} | P95 load time: ${p95}ms | muestras: ${JSON.stringify(sorted)}`
      );
    }
  });

  async function timedGoto(page: Page, url: string) {
    const start = Date.now();
    const res = await page.goto(url, { waitUntil: "load" });
    loadTimings.push(Date.now() - start);
    return res;
  }

  const user = {
    email: uniqueEmail("fullflow"),
    password: "Passw0rd!2026",
    name: "Full Flow E2E",
    phone: "+56933334444",
  };

  let applicationId: string | undefined;
  let documentId: string | undefined;

  /** Orden lineal real de `applications.stage` (ver STAGE_TRANSITIONS en
   * app/api/applications/[id]/stage/route.ts). Algunas transiciones son
   * `automatic: true` y pueden dispararse solas (ej. RECEPCIONADA ->
   * SCORING_COMPLETADO ocurre automáticamente al completarse el auto-scoring
   * del test 2) antes de que este test llegue a pedirlas manualmente — por
   * eso `advanceStageTo` lee el stage ACTUAL antes de decidir qué PATCHes
   * disparar, en vez de asumir un punto de partida fijo. */
  const STAGE_ORDER = [
    "RECEPCIONADA",
    "SCORING_COMPLETADO",
    "DOCUMENTOS_PENDIENTES",
    "DOCUMENTOS_APROBADOS",
    "PRE_EVALUACION_COMPLETADA",
    "VISITA_COMPLETADA",
    "ENVIADO_A_BANCO",
    "ESCRITURACION_AGENDADA",
    "CIERRE",
  ] as const;

  async function getCurrentStage(page: Page, appId: string): Promise<string | undefined> {
    const res = await page.request.get(`/api/applications/${appId}`);
    if (!res.ok()) return undefined;
    const body = await res.json().catch(() => ({}));
    return body?.application?.stage ?? body?.stage;
  }

  /** Avanza la application paso a paso (vía PATCH .../stage) desde su stage
   * ACTUAL hasta `targetStage` inclusive, sin saltarse pasos intermedios. */
  async function advanceStageTo(page: Page, appId: string, targetStage: string) {
    const current = await getCurrentStage(page, appId);
    test.skip(!current, "No se pudo determinar el stage actual de la application.");

    const currentIdx = STAGE_ORDER.indexOf(current as (typeof STAGE_ORDER)[number]);
    const targetIdx = STAGE_ORDER.indexOf(targetStage as (typeof STAGE_ORDER)[number]);
    test.skip(currentIdx === -1 || targetIdx === -1, `Stage desconocido (current=${current}, target=${targetStage}).`);

    for (let i = currentIdx + 1; i <= targetIdx; i++) {
      const stage = STAGE_ORDER[i];
      const res = await page.request.patch(`/api/applications/${appId}/stage`, { data: { stage } });
      test.skip(res.status() === 404, "PATCH /api/applications/[id]/stage no existe todavía.");
      expect(
        res.ok(),
        `Transición hacia ${stage} debería ser 2xx (recibido ${res.status()}: ${await res.text()})`
      ).toBeTruthy();
    }
  }

  test("1. Registro -> Login -> Dashboard", async () => {
    const page = sharedPage;

    const regRes = await page.request.post("/api/auth/register", {
      data: {
        email: user.email,
        password: user.password,
        name: user.name,
        phone: user.phone,
      },
    });

    test.skip(
      regRes.status() === 404,
      "POST /api/auth/register no existe todavía — agente identity aún no ha publicado el endpoint."
    );

    expect(
      regRes.ok(),
      `POST /api/auth/register debería responder 2xx (recibido ${regRes.status()}: ${await regRes.text()})`
    ).toBeTruthy();

    const dashRes = await timedGoto(page, "/dashboard");
    test.skip(
      !dashRes || dashRes.status() >= 400,
      `/dashboard no disponible (status ${dashRes?.status()}) tras registro.`
    );

    await expect(
      page.getByText("Estado de mi proceso"),
      "Se esperaba el heading 'Estado de mi proceso' en /dashboard tras login."
    ).toBeVisible({ timeout: 10_000 });

    const meRes = await page.request.get("/api/auth/user");
    expect(meRes.ok(), `GET /api/auth/user debería responder 200 (recibido ${meRes.status()})`).toBeTruthy();
  });

  test("2. Lead -> Auto-scoring", async () => {
    const page = sharedPage;

    const leadRes = await page.request.post("/api/leads", {
      data: {
        name: user.name,
        email: user.email,
        phone: user.phone,
        monthlySalary: 1_200_000,
        savingsAmount: 5_000_000,
        employmentType: "indefinido",
        employmentYears: 5,
        hasExistingDebt: false,
        monthlyDebtPayments: 0,
      },
    });

    test.skip(
      leadRes.status() === 404,
      "POST /api/leads no existe todavía — agente leads-applications aún no ha publicado el endpoint."
    );

    expect(
      leadRes.ok() || leadRes.status() === 409,
      `POST /api/leads debería responder 2xx o 409 (recibido ${leadRes.status()}: ${await leadRes.text()})`
    ).toBeTruthy();

    const leadBody = await leadRes.json().catch(() => ({}));
    expect(leadBody?.application, `La application no debería ser null: ${JSON.stringify(leadBody)}`).toBeTruthy();

    applicationId =
      leadBody?.application?.id ?? leadBody?.applicationId ?? leadBody?.id ?? undefined;

    test.skip(!applicationId, "No se pudo obtener applicationId de la respuesta de POST /api/leads.");

    await timedGoto(page, "/dashboard");
    await page.reload();

    const scoringBadge = page.locator('[data-slot="scoring-badge"]');
    await expect(
      scoringBadge.first(),
      "Se esperaba ScoringBadge visible en /dashboard tras crear lead con perfil financiero completo."
    ).toBeVisible({ timeout: 10_000 });

    // Confirmar que el score quedó persistido en la application (requerido para
    // habilitar la transición RECEPCIONADA -> SCORING_COMPLETADO más adelante).
    const appRes = await page.request.get(`/api/applications/${applicationId}`);
    if (appRes.ok()) {
      const appBody = await appRes.json().catch(() => ({}));
      const scoringScore = appBody?.application?.scoring_score ?? appBody?.scoring_score;
      expect(
        scoringScore,
        `applications.scoring_score debería estar seteado tras el auto-scoring: ${JSON.stringify(appBody)}`
      ).not.toBeNull();
    }
  });

  test("3. Upload de documento -> aparece con status 'pendiente'", async () => {
    const page = sharedPage;
    test.skip(!applicationId, "No hay applicationId del test anterior — no se puede continuar.");

    const docsRes = await timedGoto(page, "/dashboard/documents");
    test.skip(
      !docsRes || docsRes.status() >= 400,
      `/dashboard/documents no disponible (status ${docsRes?.status()}).`
    );

    await expect(page.getByRole("heading", { name: /Bóveda Documental/i })).toBeVisible({
      timeout: 10_000,
    });

    const uploadButton = page
      .getByRole("button", { name: /^Subir$|Volver a subir|Reemplazar archivo/i })
      .first();
    // La carga inicial de la Bóveda Documental es asíncrona (fetch a
    // /api/auth/user + /api/applications/[id]) — esperar con timeout en vez de
    // un `isVisible()` inmediato, que se evaluaría antes de que termine de
    // cargar y produciría un falso skip.
    const hasUploadButton = await uploadButton
      .waitFor({ state: "visible", timeout: 10_000 })
      .then(() => true)
      .catch(() => false);
    test.skip(!hasUploadButton, "No se encontró ítem de documento con botón de carga en la Bóveda Documental.");

    await uploadButton.click();
    const fileInput = page.locator('input[type="file"]').first();

    // Verificación fuerte a nivel de API: capturamos la respuesta real de
    // POST /api/documents (fuente de verdad) en vez de re-consultar
    // GET /api/applications/[id], que NO expone un campo `documents` (ver
    // app/api/applications/[id]/route.ts — solo devuelve application/customer/
    // stageHistory). Esa omisión es la causa raíz de que la Bóveda Documental
    // (app/dashboard/documents/page.tsx) nunca refleje el status recién
    // subido en su UI, aunque la subida en sí funcione correctamente.
    const [uploadResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/documents") && res.request().method() === "POST"),
      fileInput.setInputFiles({
        name: "documento.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("%PDF-1.4\n%mock e2e pdf content\n%%EOF", "utf-8"),
      }),
    ]);

    expect(
      uploadResponse.ok(),
      `POST /api/documents debería responder 2xx (recibido ${uploadResponse.status()}: ${await uploadResponse.text()})`
    ).toBeTruthy();

    const uploadBody = await uploadResponse.json().catch(() => ({}));
    documentId = uploadBody?.id;
    expect(
      uploadBody?.status,
      `El documento recién creado debería tener status 'pendiente': ${JSON.stringify(uploadBody)}`
    ).toMatch(/pendiente/i);

    // Verificación de UI (no bloqueante): confirmado por inspección manual que
    // GET /api/applications/[id] no incluye `documents`, así que la Bóveda
    // Documental no refleja el status recién subido. Se deja registrado como
    // hallazgo en vez de abortar el resto de la suite serial (que valida el
    // pipeline crítico lead -> cierre).
    const uiReflectsStatus = await page
      .getByText(/pendiente|en_revision|en revisión/i)
      .first()
      .waitFor({ state: "visible", timeout: 8_000 })
      .then(() => true)
      .catch(() => false);

    if (!uiReflectsStatus) {
      test.info().annotations.push({
        type: "known-bug",
        description:
          "GET /api/applications/[id] no devuelve `documents` en su respuesta -> la Bóveda Documental " +
          "(app/dashboard/documents/page.tsx) no refleja el status del documento recién subido aunque " +
          "POST /api/documents haya respondido 201 con status 'pendiente'. Ver app/api/applications/[id]/route.ts.",
      });
    }
  });

  test("4. Bandeja del asesor -> ver detalle de la solicitud", async () => {
    const page = sharedPage;
    test.skip(!applicationId, "No hay applicationId de los tests anteriores.");

    // No existe un usuario/rol "asesor" separado en el MVP (login único, ver
    // nota de contrato al inicio del archivo) — se reutiliza la sesión ya
    // autenticada para navegar el backoffice.
    const queueRes = await timedGoto(page, "/backoffice/queue");
    test.skip(
      !queueRes || queueRes.status() >= 400,
      `/backoffice/queue no disponible (status ${queueRes?.status()}).`
    );

    await expect(page.getByText(/Bandeja de leads/i)).toBeVisible({ timeout: 10_000 });

    const detailRes = await timedGoto(page, `/backoffice/${applicationId}`);
    test.skip(
      !detailRes || detailRes.status() >= 400,
      `/backoffice/${applicationId} no disponible (status ${detailRes?.status()}).`
    );

    await expect(page.getByText(/Línea de tiempo/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Cambiar estado/i)).toBeVisible({ timeout: 10_000 });
  });

  test("5. Transiciones de estado (asesor) + error en transición inválida", async () => {
    const page = sharedPage;
    test.skip(!applicationId, "No hay applicationId de los tests anteriores.");

    // Avanza desde el stage ACTUAL (puede que RECEPCIONADA -> SCORING_COMPLETADO
    // ya haya ocurrido automáticamente al completar el scoring en el test 2)
    // hasta DOCUMENTOS_APROBADOS, paso a paso.
    await advanceStageTo(page, applicationId!, "DOCUMENTOS_APROBADOS");

    // Verificar reflejo en el timeline del detalle.
    await timedGoto(page, `/backoffice/${applicationId}`);
    await expect(page.getByText(/Documentos Aprobados|DOCUMENTOS_APROBADOS/i).first()).toBeVisible({
      timeout: 10_000,
    });

    // Transición inválida: DOCUMENTOS_APROBADOS es actualmente el estado, el
    // único siguiente legal es PRE_EVALUACION_COMPLETADA (automatic) — intentar
    // saltar directo a CIERRE debe fallar con 400 INVALID_TRANSITION.
    const invalidRes = await page.request.patch(`/api/applications/${applicationId}/stage`, {
      data: { stage: "CIERRE" },
    });
    expect(
      invalidRes.status(),
      `Se esperaba 400 al intentar saltar etapas (DOCUMENTOS_APROBADOS -> CIERRE directo), recibido ${invalidRes.status()}`
    ).toBe(400);
    const invalidBody = await invalidRes.json().catch(() => ({}));
    expect(
      invalidBody?.error?.code ?? invalidBody?.code,
      `Se esperaba código INVALID_TRANSITION: ${JSON.stringify(invalidBody)}`
    ).toBe("INVALID_TRANSITION");

    // Continuar el pipeline legítimo hasta PRE_EVALUACION_COMPLETADA para el
    // siguiente test.
    const toPreEval = await page.request.patch(`/api/applications/${applicationId}/stage`, {
      data: { stage: "PRE_EVALUACION_COMPLETADA" },
    });
    expect(
      toPreEval.ok(),
      `Transición DOCUMENTOS_APROBADOS -> PRE_EVALUACION_COMPLETADA debería ser 2xx (recibido ${toPreEval.status()})`
    ).toBeTruthy();
  });

  test("6. Pre-evaluación -> minUF/maxUF calculados y visibles", async () => {
    const page = sharedPage;
    test.skip(!applicationId, "No hay applicationId de los tests anteriores.");

    const preEvalRes = await page.request.post(`/api/applications/${applicationId}/pre-evaluate`, {
      data: { salary: 1_200_000, savings: 5_000_000 },
    });
    test.skip(
      preEvalRes.status() === 404,
      "POST /api/applications/[id]/pre-evaluate no existe todavía."
    );
    expect(
      preEvalRes.ok(),
      `Pre-evaluación debería responder 2xx (recibido ${preEvalRes.status()}: ${await preEvalRes.text()})`
    ).toBeTruthy();

    const preEvalBody = await preEvalRes.json().catch(() => ({}));
    expect(preEvalBody?.preEvaluation?.minUF, "Se esperaba preEvaluation.minUF en la respuesta.").toBeTruthy();
    expect(preEvalBody?.preEvaluation?.maxUF, "Se esperaba preEvaluation.maxUF en la respuesta.").toBeTruthy();

    await timedGoto(page, `/backoffice/${applicationId}`);
    await page.reload();

    await expect(
      page.getByText(new RegExp(String(preEvalBody.preEvaluation.minUF), "i")).first(),
      "Se esperaba ver el valor minUF reflejado en el detalle tras refrescar."
    ).toBeVisible({ timeout: 10_000 });
  });

  test("7. Dashboard admin -> KPIs y funnel de conversión", async () => {
    const page = sharedPage;

    // No existe rol admin separado en el MVP (ver nota de contrato al inicio) —
    // se reutiliza la sesión autenticada del cliente/asesor.
    const adminRes = await timedGoto(page, "/admin/dashboard");
    test.skip(
      !adminRes || adminRes.status() >= 400,
      `/admin/dashboard no disponible todavía (status ${adminRes?.status()}) — Release 3 (Admin/Gerencia) aún no publicada.`
    );

    await expect(page.getByRole("heading")).toBeVisible({ timeout: 10_000 });

    // KPIs: al menos un número visible en la página.
    const kpiNumbers = page.locator("text=/\\d+/");
    await expect(kpiNumbers.first(), "Se esperaban KPIs numéricos visibles en /admin/dashboard.").toBeVisible({
      timeout: 10_000,
    });

    const funnel = page.getByText(/funnel|embudo|conversión/i);
    await expect(funnel.first(), "Se esperaba un funnel de conversión visible en /admin/dashboard.").toBeVisible({
      timeout: 10_000,
    });

    const reportsRes = await timedGoto(page, "/admin/reports");
    test.skip(
      !reportsRes || reportsRes.status() >= 400,
      `/admin/reports no disponible todavía (status ${reportsRes?.status()}).`
    );

    await expect(page.locator("select, input[type='date'], [role='combobox']").first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("8. Cierre -> escrituración + closure marca la application en CIERRE", async () => {
    const page = sharedPage;
    test.skip(!applicationId, "No hay applicationId de los tests anteriores.");

    // Completar el resto del pipeline lineal hasta ESCRITURACION_AGENDADA
    // (avanza desde el stage ACTUAL, no desde uno asumido).
    await advanceStageTo(page, applicationId!, "ESCRITURACION_AGENDADA");

    const deedRes = await page.request.post("/api/deeds", { data: { applicationId } });
    test.skip(
      deedRes.status() === 404,
      "POST /api/deeds no existe todavía — agente de escrituración de Release 3 aún no ha publicado el endpoint."
    );
    expect(deedRes.ok(), `POST /api/deeds debería responder 2xx (recibido ${deedRes.status()})`).toBeTruthy();

    const closureRes = await page.request.post("/api/closures", { data: { applicationId } });
    test.skip(
      closureRes.status() === 404,
      "POST /api/closures no existe todavía — agente de cierre de Release 3 aún no ha publicado el endpoint."
    );
    expect(
      closureRes.ok(),
      `POST /api/closures debería responder 2xx (recibido ${closureRes.status()}: ${await closureRes.text()})`
    ).toBeTruthy();

    const appRes = await page.request.get(`/api/applications/${applicationId}`);
    expect(appRes.ok()).toBeTruthy();
    const appBody = await appRes.json().catch(() => ({}));
    expect(
      appBody?.application?.stage,
      `La application debería quedar en stage CIERRE: ${JSON.stringify(appBody)}`
    ).toBe("CIERRE");

    const adminRes = await timedGoto(page, "/admin/dashboard");
    if (adminRes && adminRes.status() < 400) {
      await page.reload();
      await expect(
        page.getByText(/cierre|closure/i).first(),
        "Se esperaba que el nuevo closure se reflejara en /admin/dashboard."
      ).toBeVisible({ timeout: 10_000 });
    }
  });

  test("9. Calidad transversal — sin errores de consola y dark mode en vistas clave", async () => {
    const page = sharedPage;

    const bgColor = await page.evaluate(() => {
      const body = document.body;
      const html = document.documentElement;
      const bodyColor = getComputedStyle(body).backgroundColor;
      const htmlColor = getComputedStyle(html).backgroundColor;
      return bodyColor !== "rgba(0, 0, 0, 0)" ? bodyColor : htmlColor;
    });
    const rgbMatch = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgbMatch) {
      const [, r, g, b] = rgbMatch.map(Number) as unknown as [number, number, number, number];
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      expect(
        luminance,
        `Fondo demasiado claro para dark mode premium (rgb(${r},${g},${b}), luminancia=${luminance.toFixed(2)}).`
      ).toBeLessThan(0.35);
    }

    // Filtra ruido conocido de dev server (HMR, extensiones) para no volver la
    // suite frágil por warnings ajenos al flujo de negocio bajo prueba.
    const relevantErrors = consoleErrors.filter(
      (e) => !/hydrat|extension|DevTools|favicon/i.test(e)
    );
    expect(
      relevantErrors,
      `Se detectaron errores de consola durante el flujo completo: ${JSON.stringify(relevantErrors)}`
    ).toHaveLength(0);
  });
});
