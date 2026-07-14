/**
 * Extracción de texto de documentos subidos, para validación automática
 * (ver `lib/ocr/validateDocument.ts`). Dos motores según el tipo de archivo:
 *
 * - PDF: `pdf-parse` — solo funciona si el PDF tiene una capa de texto real
 *   (exportado digitalmente); un PDF escaneado como imagen no tendrá texto
 *   extraíble por esta vía (limitación conocida, documentada en el resultado).
 * - Imágenes (JPEG/PNG/WEBP): `tesseract.js` (Tesseract OCR compilado a
 *   WASM) en español — cubre el caso de fotos/escaneos de cédulas,
 *   liquidaciones, etc.
 *
 * Nunca lanza: si la extracción falla (archivo corrupto, timeout de OCR),
 * devuelve `{ text: "", engine, error }` en vez de romper el flujo de subida
 * — el documento simplemente queda sin pre-validación automática.
 */
import { createWorker } from "tesseract.js";

export interface ExtractTextResult {
  text: string;
  engine: "pdf-parse" | "tesseract" | "unsupported";
  error?: string;
}

const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

export async function extractText(buffer: Buffer, mimeType: string): Promise<ExtractTextResult> {
  if (mimeType === "application/pdf") {
    return extractFromPdf(buffer);
  }
  if (IMAGE_MIME_TYPES.has(mimeType)) {
    return extractFromImage(buffer);
  }
  return { text: "", engine: "unsupported", error: `Unsupported MIME type: ${mimeType}` };
}

async function extractFromPdf(buffer: Buffer): Promise<ExtractTextResult> {
  try {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();
    await parser.destroy?.();
    return { text: result.text ?? "", engine: "pdf-parse" };
  } catch (err) {
    return {
      text: "",
      engine: "pdf-parse",
      error: err instanceof Error ? err.message : "Unknown pdf-parse error",
    };
  }
}

async function extractFromImage(buffer: Buffer): Promise<ExtractTextResult> {
  let worker: Awaited<ReturnType<typeof createWorker>> | null = null;
  try {
    worker = await createWorker("spa");
    const {
      data: { text },
    } = await worker.recognize(buffer);
    return { text: text ?? "", engine: "tesseract" };
  } catch (err) {
    return {
      text: "",
      engine: "tesseract",
      error: err instanceof Error ? err.message : "Unknown tesseract error",
    };
  } finally {
    await worker?.terminate().catch(() => {});
  }
}
