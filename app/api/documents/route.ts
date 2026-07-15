import { NextResponse } from "next/server";
import { requireAuth } from "@/app/api/_shared";
import { apiError, withErrorHandling, HTTP_STATUS } from "@/app/api/_shared";
import { createSupabaseServiceRoleClient } from "@/lib/supabase";
import { extractText } from "@/lib/ocr/extractText";
import { validateDocument } from "@/lib/ocr/validateDocument";
import { maybeAdvanceAfterDocumentApproval } from "@/lib/stage-machine";

/**
 * Fixed org_id used across the MVP (single-tenant operation, multi-tenant
 * ready schema). Mirrors `database/schema.sql`'s seeded default organization.
 */
const DEFAULT_ORG_ID = "00000000-0000-0000-0000-000000000001";

/** Name of the private Supabase Storage bucket used for application documents. */
const DOCUMENTS_BUCKET = "documents";

/** MIME types allowed for uploaded documents (images + PDF only). */
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

/** Max upload size: 10MB. */
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/** Document status values, exactly as defined in `documents.status` (schema.sql). */
const DEFAULT_DOCUMENT_STATUS = "pendiente";

/**
 * Ensures the private `documents` Storage bucket exists. Safe to call on
 * every request — `createBucket` errors with "already exists" are ignored.
 * MVP-scale traffic makes the extra existence check per upload acceptable;
 * revisit if this becomes a hot path.
 */
async function ensureDocumentsBucketExists(
  supabase: ReturnType<typeof createSupabaseServiceRoleClient>
): Promise<void> {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    // Non-fatal: if listing fails we still attempt the upload, which will
    // surface a clearer error if the bucket truly doesn't exist.
    return;
  }

  const exists = buckets?.some((b) => b.name === DOCUMENTS_BUCKET);
  if (exists) return;

  await supabase.storage.createBucket(DOCUMENTS_BUCKET, {
    public: false,
    fileSizeLimit: MAX_FILE_SIZE_BYTES,
  });
}

/**
 * POST /api/documents
 *
 * Uploads a document file to Supabase Storage (private `documents` bucket)
 * and creates the corresponding row in `documents` with status = 'pendiente'.
 *
 * Body: `multipart/form-data` with fields:
 *   - `file`: the file itself (PDF or image, max 10MB)
 *   - `applicationId`: UUID of the target application
 *   - `type`: document type string (e.g. "cedula", "liquidacion_sueldo")
 *
 * NOTE: no real antivirus/malware scanning happens here — MVP mock only,
 * MIME/size validation is a basic client-facing guard, not a security
 * boundary.
 *
 * Response 201: the created `documents` row.
 */
export const POST = withErrorHandling(async (request: Request) => {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  // Storage bucket management and inserts use the service-role client:
  // creating a Storage bucket requires elevated privileges, and RLS is
  // intentionally disabled in the MVP (see CLAUDE.md) — `requireAuth` above
  // is what gates this endpoint to logged-in users.
  const supabase = createSupabaseServiceRoleClient();

  const formData = await request.formData();
  const file = formData.get("file");
  const applicationId = formData.get("applicationId");
  const type = formData.get("type");

  if (!(file instanceof File)) {
    return apiError("Missing or invalid 'file' field", HTTP_STATUS.BAD_REQUEST, "MISSING_FILE");
  }
  if (typeof applicationId !== "string" || applicationId.length === 0) {
    return apiError(
      "Missing or invalid 'applicationId' field",
      HTTP_STATUS.BAD_REQUEST,
      "MISSING_APPLICATION_ID"
    );
  }
  if (typeof type !== "string" || type.length === 0) {
    return apiError("Missing or invalid 'type' field", HTTP_STATUS.BAD_REQUEST, "MISSING_TYPE");
  }

  // El cliente debe elegir su propuesta inicial (simulación de riesgo, ver
  // POST /api/applications/[id]/select-initial-proposal) ANTES de subir
  // documentos -- esa acción es la que avanza la application a
  // DOCUMENTOS_PENDIENTES. Si todavía está en SCORING_COMPLETADO (o antes),
  // no aceptamos documentos para evitar confundir al cliente con una carga
  // de archivos sin haber visto su simulación.
  const { data: applicationForStage } = await (supabase.from("applications") as any)
    .select("stage")
    .eq("id", applicationId)
    .maybeSingle();
  if (applicationForStage && ["RECEPCIONADA", "SCORING_COMPLETADO"].includes(applicationForStage.stage)) {
    return apiError(
      "Primero debes elegir tu propuesta inicial antes de subir documentos.",
      HTTP_STATUS.BAD_REQUEST,
      "PROPOSAL_NOT_SELECTED"
    );
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return apiError(
      `File type '${file.type}' not allowed. Allowed: PDF, JPEG, PNG, WEBP`,
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
      "INVALID_FILE_TYPE"
    );
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return apiError(
      `File too large (${file.size} bytes). Max allowed: ${MAX_FILE_SIZE_BYTES} bytes`,
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
      "FILE_TOO_LARGE"
    );
  }

  await ensureDocumentsBucketExists(supabase);

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${applicationId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return apiError(
      `Failed to upload file: ${uploadError.message}`,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "UPLOAD_FAILED"
    );
  }

  // NOTE: `lib/supabase/types.ts` is still a placeholder (`Tables: Record<string, never>`)
  // pending the DB Architect generating real types from `database/schema.sql` — the `as any`
  // casts below are a temporary bridge so this route can type-check meanwhile. Safe to
  // remove once real generated types land.
  const { data: documentRow, error: insertError } = await (supabase.from("documents") as any)
    .insert({
      org_id: DEFAULT_ORG_ID,
      application_id: applicationId,
      type,
      url: storagePath,
      status: DEFAULT_DOCUMENT_STATUS,
    })
    .select()
    .single();

  if (insertError) {
    // Best-effort cleanup: remove the orphaned file if the DB insert failed.
    await supabase.storage.from(DOCUMENTS_BUCKET).remove([storagePath]);
    return apiError(
      `Failed to create document record: ${insertError.message}`,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "DOCUMENT_INSERT_FAILED"
    );
  }

  // Pre-validación automática vía OCR (best-effort): nunca bloquea la
  // subida si falla, y nunca aprueba por sí sola un documento — solo
  // adelanta trabajo al asesor (auto-rechaza lo que claramente no
  // corresponde, o marca "en_revision" con la validación ya hecha).
  const finalDocument = await runOcrPreValidation(supabase, documentRow, file, applicationId);

  return NextResponse.json(finalDocument ?? documentRow, { status: 201 });
});

/**
 * Corre OCR + validación de contenido sobre el archivo recién subido y
 * actualiza `documents.status`/`extracted_data` según el resultado:
 * - texto no extraíble -> se deja en 'pendiente' (revisión manual normal).
 * - validación falla -> 'rechazado' con las razones en extracted_data.
 * - validación pasa -> 'aprobado' directamente (el OCR reemplaza la
 *   revisión manual para los 4 tipos de documento requeridos). Si con este
 *   documento la application ya tiene los 4 tipos aprobados, dispara el
 *   avance automático a DOCUMENTOS_APROBADOS (ver lib/stage-machine.ts).
 *
 * Nunca lanza: cualquier error se traga y el documento queda en su estado
 * por defecto ('pendiente'), igual que si esta función no existiera.
 */
async function runOcrPreValidation(
  supabase: ReturnType<typeof createSupabaseServiceRoleClient>,
  documentRow: any,
  file: File,
  applicationId: string
): Promise<any | null> {
  try {
    const { data: application } = await (supabase.from("applications") as any)
      .select("customer_id")
      .eq("id", applicationId)
      .maybeSingle();
    if (!application?.customer_id) return null;

    const { data: customer } = await (supabase.from("customers") as any)
      .select("name, rut_ciphertext")
      .eq("id", application.customer_id)
      .maybeSingle();
    if (!customer) return null;

    const buffer = Buffer.from(await file.arrayBuffer());
    const { text, engine, error: ocrError } = await extractText(buffer, file.type);

    if (!text) {
      // No se pudo extraer texto (PDF escaneado, imagen ilegible, etc.) —
      // se deja en 'pendiente' para revisión manual normal, sin bloquear.
      await (supabase.from("documents") as any)
        .update({ extracted_data: { engine, error: ocrError ?? "No text extracted" } })
        .eq("id", documentRow.id);
      return null;
    }

    const validation = validateDocument(documentRow.type, text, {
      name: customer.name,
      rut: customer.rut_ciphertext,
    });

    const newStatus = validation.valid ? "aprobado" : "rechazado";

    const { data: updated } = await (supabase.from("documents") as any)
      .update({
        status: newStatus,
        extracted_data: {
          engine,
          validation,
          // Solo se guarda un extracto acotado del texto OCR (evidencia
          // para el asesor), no el documento completo.
          textPreview: text.slice(0, 1000),
        },
      })
      .eq("id", documentRow.id)
      .select()
      .single();

    if (newStatus === "aprobado") {
      await maybeAdvanceAfterDocumentApproval(supabase as any, applicationId);
    }

    return updated ?? null;
  } catch (err) {
    // OCR es una mejora, no un requisito — cualquier falla inesperada deja
    // el documento tal como quedó tras el insert original.
    console.error("[OCR pre-validation] failed:", err);
    return null;
  }
}
