import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Los tests E2E (tests/e2e/*.spec.ts) usan la API de Playwright, no la de
 * Vitest — deben excluirse explícitamente del runner de unit tests para que
 * `npm test` (Vitest) y `npm run test:e2e` (Playwright) no se pisen.
 *
 * `resolve.alias` para "@/*" replica el `paths` de tsconfig.json (Next.js lo
 * resuelve solo, pero Vitest/Vite no leen tsconfig `paths` por defecto) --
 * necesario para que los tests de integración de
 * tests/unit/wizard-variables-immutability.test.ts puedan importar los Route
 * Handlers reales (app/api/**), que usan imports "@/..." internamente.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    exclude: ["tests/e2e/**", "node_modules/**"],
  },
});
