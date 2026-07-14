import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * `pdf-parse` (usado en lib/ocr/extractText.ts) depende de `pdfjs-dist`,
   * que intenta cargar su propio worker (`pdf.worker.mjs`) en runtime — algo
   * que el bundler de Next (Turbopack/webpack) no resuelve si el paquete se
   * empaqueta junto con el código de la app. Marcarlo como "external" hace
   * que Node lo resuelva vía `require`/`import` normal en runtime, igual que
   * cualquier otra dependencia de node_modules.
   */
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
};

export default nextConfig;
