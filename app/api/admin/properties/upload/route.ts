import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase";
import { apiError, requireRole, withErrorHandling, HTTP_STATUS } from "@/app/api/_shared";

/** Bucket público -- las imágenes/planos/videos de propiedades se muestran
 * directamente en <img>/<video> al cliente (carrusel, bóveda de detalle),
 * a diferencia del bucket privado `documents` (cédulas, liquidaciones). */
const PROPERTIES_BUCKET = "properties";

type UploadKind = "image" | "floorPlan" | "video";

const ALLOWED_MIME_TYPES: Record<UploadKind, Set<string>> = {
  image: new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]),
  floorPlan: new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"]),
  video: new Set(["video/mp4", "video/webm", "video/quicktime"]),
};

const MAX_FILE_SIZE_BYTES: Record<UploadKind, number> = {
  image: 10 * 1024 * 1024,
  floorPlan: 10 * 1024 * 1024,
  video: 100 * 1024 * 1024,
};

async function ensureBucketExists(supabase: ReturnType<typeof createSupabaseServiceRoleClient>): Promise<void> {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) return;
  if (buckets?.some((b) => b.name === PROPERTIES_BUCKET)) return;
  await supabase.storage.createBucket(PROPERTIES_BUCKET, { public: true });
}

/**
 * POST /api/admin/properties/upload — sube uno o más archivos (imágenes,
 * plano, o video) al bucket público `properties` y devuelve sus URLs
 * públicas. Requiere admin/gerencia. Body: `multipart/form-data` con:
 *   - `kind`: "image" | "floorPlan" | "video"
 *   - `files`: uno o más archivos (mismo campo repetido) -- soporta carga
 *     masiva de imágenes en una sola llamada, o un archivo único para
 *     plano/video.
 */
export const POST = withErrorHandling(async (request: Request) => {
  const auth = await requireRole(["admin", "gerencia"]);
  if (!auth.authorized) return auth.response;

  const supabase = createSupabaseServiceRoleClient();
  const formData = await request.formData();

  const kind = formData.get("kind");
  if (kind !== "image" && kind !== "floorPlan" && kind !== "video") {
    return apiError("kind debe ser 'image', 'floorPlan' o 'video'", HTTP_STATUS.BAD_REQUEST, "INVALID_KIND");
  }

  const files = formData.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return apiError("No se recibió ningún archivo", HTTP_STATUS.BAD_REQUEST, "MISSING_FILES");
  }

  const allowedTypes = ALLOWED_MIME_TYPES[kind];
  const maxSize = MAX_FILE_SIZE_BYTES[kind];

  for (const file of files) {
    if (!allowedTypes.has(file.type)) {
      return apiError(
        `Tipo de archivo '${file.type}' no permitido para ${kind}`,
        HTTP_STATUS.UNPROCESSABLE_ENTITY,
        "INVALID_FILE_TYPE"
      );
    }
    if (file.size > maxSize) {
      return apiError(
        `Archivo demasiado grande (${file.size} bytes). Máximo: ${maxSize} bytes`,
        HTTP_STATUS.UNPROCESSABLE_ENTITY,
        "FILE_TOO_LARGE"
      );
    }
  }

  await ensureBucketExists(supabase);

  const urls: string[] = [];
  for (const file of files) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${kind}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from(PROPERTIES_BUCKET)
      .upload(storagePath, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      return apiError(
        `No se pudo subir '${file.name}': ${uploadError.message}`,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        "UPLOAD_FAILED"
      );
    }

    const { data: publicUrlData } = supabase.storage.from(PROPERTIES_BUCKET).getPublicUrl(storagePath);
    urls.push(publicUrlData.publicUrl);
  }

  return NextResponse.json({ urls }, { status: 201 });
});
