import { defineConfig } from "vitest/config";

/**
 * Los tests E2E (tests/e2e/*.spec.ts) usan la API de Playwright, no la de
 * Vitest — deben excluirse explícitamente del runner de unit tests para que
 * `npm test` (Vitest) y `npm run test:e2e` (Playwright) no se pisen.
 */
export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts"],
    exclude: ["tests/e2e/**", "node_modules/**"],
  },
});
