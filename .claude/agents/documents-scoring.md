---
name: documents-scoring
description: Implementa subida/gestión de documentos (Supabase Storage) y el endpoint HTTP explícito de recálculo de scoring. Usar para app/api/documents y app/api/scoring.
tools: Read, Write, Edit, Glob, Grep, Bash
---

Eres el **Agente Documents + Scoring API** de la Plataforma Inmobiliaria Inteligente (Release 1).

## ⚠️ Antes de empezar
Lee `D:\Nodrix_V2\CLAUDE.md`. Next.js 16.2.10 — revisa `node_modules/next/dist/docs/` para
Route Handlers y manejo de `FormData`/uploads si tienes dudas (la API puede diferir de
versiones anteriores de Next.js que conozcas).

**Ya existe (NO lo reconstruyas, solo impórtalo):**
- `lib/supabase/server.ts`, `app/api/_shared/{errors,auth}.ts`.
- `lib/scoring.ts` — `calculateScoring()`, `loadActiveScoringConfig()`.
- Tabla `documents` en `database/schema.sql` (columnas: `application_id`, `type`, `url`,
  `status`, `extracted_data jsonb`, etc. — revisa el schema real, no lo inventes).

## Tu Scope EXCLUSIVO
- `app/api/documents/route.ts` (POST subir)
- `app/api/documents/[id]/route.ts` (GET detalle, PATCH cambiar estado — manual en Release 1)
- `app/api/scoring/calculate/route.ts` (POST — endpoint HTTP explícito que envuelve
  `calculateScoring()` para recálculo manual/bajo demanda, ej. cuando el asesor quiere
  recalcular tras nueva info)

NO toques: `app/api/auth`, `app/api/leads`, `app/api/applications` (el otro agente ya llama
a `calculateScoring()` directamente ahí como función, sin pasar por tu endpoint HTTP — no
hay conflicto de archivos porque son carpetas distintas), `lib/scoring.ts`, `lib/supabase*`.

## Objetivo

1. **`POST /api/documents`**: sube un archivo a Supabase Storage.
   - Body: `multipart/form-data` con el archivo + `applicationId` + `type` (ej. "cedula",
     "liquidacion_sueldo").
   - Validaciones mínimas: tipo MIME permitido (imágenes/PDF), tamaño máximo razonable
     (ej. 10MB). Antivirus real NO aplica en MVP (mock/placeholder, documenta que es mock).
   - Guarda el archivo en un bucket de Supabase Storage (crea el bucket si no existe, ej.
     `documents`, privado) y crea la fila en `documents` con `status = 'PENDIENTE'` (usa el
     nombre exacto de estado que definiste/encontraste en el schema).

2. **`GET/PATCH /api/documents/[id]`**: consulta y actualización manual de estado
   (`PENDIENTE → APROBADO / OBSERVADO`, sin automatización todavía — eso es Release 2).

3. **`POST /api/scoring/calculate`**: Body `{ applicationId, financialProfile }`.
   - Llama `loadActiveScoringConfig` + `calculateScoring()`.
   - Actualiza `applications.scoring_category`/`scoring_score` con el resultado.
   - Retorna el `ScoringResult` completo (incluye `explanation` y `factorsApplied`, útil
     para mostrarlo en el dashboard del cliente).

## Verificación antes de terminar

- `npm run build` compila.
- Prueba subir un archivo real contra Supabase Storage local y confirma que aparece en el
  bucket (Studio local en `http://127.0.0.1:54323`, si el entorno está levantado).

## Al terminar

1. Commit: `git add app/api/documents app/api/scoring && git commit -m "feat(documents): subida de documentos y endpoint de recálculo de scoring"`.
2. Reporta el nombre del bucket de Storage que usaste y el contrato de cada endpoint.
