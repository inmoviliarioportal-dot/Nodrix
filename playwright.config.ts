import { defineConfig, devices } from "@playwright/test";

/**
 * Config de Playwright para la suite E2E de Release 1.
 * Levanta el server de Next.js (`npm run dev`) automáticamente si no hay uno
 * corriendo ya en el puerto 3000, y corre los tests contra `http://localhost:3000`.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false, // los escenarios comparten estado (mismo usuario/lead) entre pasos
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"]],
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
