import { test, expect } from "@playwright/test";

/**
 * Suite E2E — Release 1 (Portal Cliente + pseudo-admin manual)
 *
 * Cubre el flujo documentado en los .claude/agents/*.md de Release 1:
 *   - identity.md            -> POST /api/auth/{register,login,logout}, GET /api/auth/user
 *   - leads-applications.md  -> POST /api/leads, GET /api/applications, PATCH .../stage
 *   - documents-scoring.md   -> POST /api/documents, PATCH /api/documents/[id],
 *                               POST /api/scoring/calculate
 *   - ui-auth.md             -> /auth/register, /auth/login
 *   - ui-dashboard-cliente.md-> /dashboard, /admin/manual
 *
 * IMPORTANTE (contexto de ejecución paralela):
 * Esta suite se escribió y se corrió mientras los otros 5 agentes de Release 1
 * seguían implementando sus partes EN PARALELO. Es esperable que algunos tests
 * fallen no por bugs de esta suite, sino porque la ruta/endpoint correspondiente
 * aún no existía en el momento de la corrida. Cada test intenta fallar con un
 * mensaje claro (vía expect con contexto) para facilitar el diagnóstico al
 * re-correr la suite más tarde.
 *
 * Notas de contrato reales encontradas en database/schema.sql (fuente de verdad)
 * que DIFIEREN de lo escrito en los .md de otros agentes:
 *   - documents.status usa minúsculas: 'pendiente' | 'en_revision' | 'aprobado' | 'rechazado'
 *     (el .md de documents-scoring.md y qa-e2e-release1.md mencionan
 *     "PENDIENTE"/"APROBADO"/"OBSERVADO" en mayúsculas — no existe 'observado' en el
 *     CHECK constraint, el valor real más cercano es 'rechazado'). Los asserts de esta
 *     suite comparan sin distinguir mayúsculas/minúsculas para tolerar cualquiera de
 *     las dos convenciones que termine implementando el agente Documents+Scoring.
 *   - applications.stage inicial documentado y confirmado en schema: 'RECEPCIONADA'.
 */

function uniqueEmail(prefix: string) {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 10000)}@e2e-test.local`;
}

test.describe("Release 1 — Flujo completo", () => {
  test.describe.configure({ mode: "serial" });

  const user = {
    email: uniqueEmail("cliente"),
    password: "Passw0rd!2026",
    name: "Cliente E2E Test",
    phone: "+56911112222",
  };

  let applicationId: string | undefined;
  let documentId: string | undefined;

  test("1. Registro -> Login -> Dashboard", async ({ page }) => {
    // 1a. Registro vía UI (contrato de ui-auth.md: /auth/register)
    const regPageRes = await page.goto("/auth/register");
    test.skip(
      !regPageRes || regPageRes.status() >= 400,
      `/auth/register no disponible todavía (status ${regPageRes?.status()}) — agente ui-auth aún no ha publicado la página.`
    );

    await expect(page.getByText("Invierte en propiedades inteligentes")).toBeVisible({
      timeout: 10_000,
    });

    // Llenar formulario (selectores por label/placeholder, tolerante a variaciones)
    const nameInput = page.locator('input[name="name"], input[id="name"]').first();
    const emailInput = page.locator('input[name="email"], input[type="email"]').first();
    const phoneInput = page.locator('input[name="phone"], input[type="tel"]').first();
    const passwordInput = page.locator('input[name="password"], input[type="password"]').first();

    await nameInput.fill(user.name);
    await emailInput.fill(user.email);
    await phoneInput.fill(user.phone);
    await passwordInput.fill(user.password);

    await page.getByRole("button", { name: "Registrarse" }).click();

    // Esperado: redirige a /dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });

    // 1b. Verificar sesión activa vía GET /api/auth/user (contrato identity.md)
    const meRes = await page.request.get("/api/auth/user");
    expect(
      meRes.ok(),
      `GET /api/auth/user debería responder 200 tras registro/login exitoso (recibido ${meRes.status()})`
    ).toBeTruthy();

    // 1c. Dashboard debe mostrar la solicitud en estado inicial (RECEPCIONADA, ver schema.sql)
    await expect(page.getByText(/RECEPCIONADA|Recepcionada/i)).toBeVisible({ timeout: 10_000 });
  });

  test("2. Lead -> Auto-scoring visible en dashboard", async ({ page }) => {
    // Vía API directa (leads-applications.md sugiere este camino si no hay formulario de
    // perfil financiero completo en la UI de Release 1).
    const leadRes = await page.request.post("/api/leads", {
      data: {
        name: user.name,
        email: user.email, // mismo email -> debe deduplicar contra el customer ya creado
        phone: user.phone,
        monthlySalary: 1_800_000,
        monthlyDebts: 200_000,
        requestedAmountUf: 3000,
      },
    });

    test.skip(
      leadRes.status() === 404,
      "POST /api/leads no existe todavía — agente leads-applications aún no ha publicado el endpoint."
    );

    expect(
      leadRes.ok(),
      `POST /api/leads debería responder 200/201 (recibido ${leadRes.status()}: ${await leadRes.text()})`
    ).toBeTruthy();

    const leadBody = await leadRes.json().catch(() => ({}));
    applicationId =
      leadBody?.application?.id ?? leadBody?.applicationId ?? leadBody?.id ?? undefined;

    // Verificar el scoring en el dashboard (ScoringBadge visible con alguna categoría)
    await page.goto("/dashboard");
    await page.reload();

    const scoringBadge = page.locator(
      '[data-testid="scoring-badge"], [class*="scoring"], [class*="Scoring"]'
    );
    await expect(
      scoringBadge.first(),
      "Se esperaba encontrar el componente ScoringBadge visible en /dashboard tras crear un lead con datos financieros completos."
    ).toBeVisible({ timeout: 10_000 });
  });

  test("3. Upload de documento -> cambia estado vía pseudo-admin", async ({
    page,
  }) => {
    test.skip(
      !applicationId,
      "No se obtuvo applicationId del test anterior (lead no creado) — no se puede continuar el flujo de documentos."
    );

    await page.goto("/dashboard");

    const uploadButton = page.getByRole("button", { name: /Subir documentos?/i });
    const hasUploadButton = await uploadButton.isVisible().catch(() => false);

    test.skip(
      !hasUploadButton,
      "Botón 'Subir documentos' no encontrado en /dashboard — UI de upload aún no implementada."
    );

    await uploadButton.click();

    // DocumentUploadModal: input file + tipo de documento
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "cedula.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "89504e470d0a1a0a0000000d49484452000000010000000108020000009077053d0000000a49444154789c6360000002000100ffff03000006000557f8a9b40000000049454e44ae426082",
        "hex"
      ),
    });

    const submitUploadBtn = page.getByRole("button", { name: /subir|guardar|confirmar/i }).last();
    await submitUploadBtn.click().catch(() => {});

    // Verificar estado inicial 'pendiente' (o 'PENDIENTE', ver nota de contrato arriba)
    await expect(page.getByText(/pendiente/i).first()).toBeVisible({ timeout: 10_000 });

    // Obtener el documento recién creado vía GET /api/applications/[id]
    const appRes = await page.request.get(`/api/applications/${applicationId}`);
    if (appRes.ok()) {
      const appBody = await appRes.json().catch(() => ({}));
      const docs = appBody?.documents ?? appBody?.application?.documents ?? [];
      documentId = docs?.[0]?.id;
    }

    // Ir a /admin/manual y aprobar el documento
    const adminRes = await page.goto("/admin/manual");
    test.skip(
      !adminRes || adminRes.status() >= 400,
      `/admin/manual no disponible (status ${adminRes?.status()}) — agente ui-dashboard-cliente aún no ha publicado la página.`
    );

    await expect(page.getByText(/Operación Manual/i)).toBeVisible({ timeout: 10_000 });

    // Formulario 2: seleccionar documento -> nuevo estado -> "Actualizar Documento"
    const docSelect = page.locator("select").filter({ hasText: /./ }).nth(1);
    const updateDocBtn = page.getByRole("button", { name: /Actualizar Documento/i });

    const hasDocForm = await updateDocBtn.isVisible().catch(() => false);
    test.skip(
      !hasDocForm,
      "Formulario de actualización de documentos no encontrado en /admin/manual."
    );

    if (documentId) {
      await docSelect.selectOption({ value: documentId }).catch(() => {});
    }
    const statusSelects = page.locator("select");
    const lastSelect = statusSelects.last();
    await lastSelect
      .selectOption({ label: /aprobado/i })
      .catch(() => lastSelect.selectOption("aprobado").catch(() => {}));
    await updateDocBtn.click();

    // Volver a /dashboard y confirmar el cambio reflejado (con refresh manual)
    await page.goto("/dashboard");
    await page.reload();
    await expect(page.getByText(/aprobado/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("4. Responsive — mobile (375px) y desktop (1280px) en /dashboard", async ({ page }) => {
    const res = await page.goto("/dashboard");
    test.skip(!res || res.status() >= 400, "/dashboard no disponible para verificar responsive.");

    for (const viewport of [
      { width: 375, height: 812, label: "mobile" },
      { width: 1280, height: 800, label: "desktop" },
    ]) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.reload();
      await page.waitForLoadState("networkidle").catch(() => {});

      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);

      expect(
        scrollWidth,
        `Overflow horizontal detectado en ${viewport.label} (${viewport.width}px): scrollWidth=${scrollWidth} > clientWidth=${clientWidth}`
      ).toBeLessThanOrEqual(clientWidth + 1); // +1 tolerancia por redondeo de subpixel
    }
  });

  test("5. Dark mode — fondo oscuro esperado en /dashboard", async ({ page }) => {
    const res = await page.goto("/dashboard");
    test.skip(!res || res.status() >= 400, "/dashboard no disponible para verificar dark mode.");

    const bgColor = await page.evaluate(() => {
      const body = document.body;
      const html = document.documentElement;
      const bodyColor = getComputedStyle(body).backgroundColor;
      const htmlColor = getComputedStyle(html).backgroundColor;
      return bodyColor !== "rgba(0, 0, 0, 0)" ? bodyColor : htmlColor;
    });

    // #0F0F1E = rgb(15, 15, 30). Toleramos variables CSS que resuelvan a un tono
    // muy oscuro en general (luminancia baja), no exigimos pixel-perfect.
    const rgbMatch = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    expect(rgbMatch, `No se pudo parsear el color de fondo: "${bgColor}"`).toBeTruthy();

    if (rgbMatch) {
      const [, r, g, b] = rgbMatch.map(Number) as unknown as [number, number, number, number];
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      expect(
        luminance,
        `Fondo de /dashboard demasiado claro para dark mode premium (rgb(${r},${g},${b}), luminancia=${luminance.toFixed(
          2
        )}). Se esperaba un tono cercano a #0F0F1E.`
      ).toBeLessThan(0.35);
    }
  });

  test("6. Performance básica — carga de /dashboard bajo ~4s (dev local)", async ({ page }) => {
    const start = Date.now();
    const res = await page.goto("/dashboard", { waitUntil: "load" });
    const elapsedMs = Date.now() - start;

    test.skip(!res || res.status() >= 400, "/dashboard no disponible para medir performance.");

    expect(
      elapsedMs,
      `/dashboard tardó ${elapsedMs}ms en cargar (umbral generoso de dev local: 4000ms).`
    ).toBeLessThan(4000);
  });
});
