import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { apiError, requirePermission, withErrorHandling, HTTP_STATUS } from "@/app/api/_shared";
import { MVP_ORG_ID } from "@/app/api/auth/_constants";
import type { AnySupabaseClient } from "@/lib/leads";
import { validateVariableSetHardLimits } from "@/lib/wizard-variables";
import { rowToVariableSet, validateLoanTermTiersStructure, type WizardVariableSetRow } from "../../_shared";

type PublishBody = { note?: string };

/**
 * POST /api/admin/wizard-variables/[version]/publish
 *
 * Publica una versión de `wizard_variable_sets`: la pasa a `active` y
 * archiva la que estaba activa, de forma transaccional (ver
 * `database/migrations/034_publish_wizard_variable_set_fn.sql` --
 * `publish_wizard_variable_set`, invocada vía `supabase.rpc(...)`; no hay
 * soporte de transacción multi-statement desde el cliente Supabase-js en
 * este proyecto, así que la atomicidad la garantiza una función plpgsql).
 *
 * Frenos obligatorios, en este orden:
 *   1. Rol: SOLO `admin` puede publicar, sin importar el permiso
 *      configurado de módulo -- esto es un límite de ROL fijo, igual patrón
 *      que "solo admin gestiona Roles" (ver lib/permissions.ts): gerencia
 *      puede tener permiso "edit" en "variables" (guarda borradores) pero
 *      JAMÁS puede publicar. Se valida con `requirePermission` (permiso de
 *      módulo, para llegar al endpoint) + un chequeo de rol explícito
 *      encima, no configurable.
 *   2. La versión debe existir, para la organización del MVP.
 *   3. `note` (body) no puede venir vacío -- nota de cambio obligatoria.
 *   4. `simulated_at` de la fila no puede ser NULL (requiere haber
 *      simulado primero -- el cálculo de la simulación es del agente E5,
 *      acá solo se exige el campo).
 *   5. Se REVALIDAN los límites duros de negocio y la estructura de tramos
 *      contra el contenido actual de la fila en la base (no lo que se
 *      guardó al crear el borrador) -- la fila pudo editarse directo en la
 *      base entre medio.
 *   6. La función RPC re-valida (2)-(4) otra vez dentro de la transacción,
 *      como defensa final contra una carrera entre el chequeo de arriba y
 *      el UPDATE real.
 *
 * Auditoría: cada publicación exitosa se registra en `audit_events` con
 * `action: 'wizard_variables_published'`, `before`/`after` con el número de
 * versión archivada/activada y quién publicó (mismo patrón que
 * app/api/applications/[id]/assign/route.ts).
 */
export const POST = withErrorHandling(
  async (request: Request, context: { params: Promise<{ version: string }> }) => {
    const auth = await requirePermission("variables", "edit");
    if (!auth.authorized) return auth.response;

    // Límite de ROL fijo: solo admin publica, sin importar el permiso de
    // módulo configurado para gerencia (ni siquiera "edit").
    if (auth.role !== "admin") {
      return apiError(
        "Solo un administrador puede publicar una versión de variables del wizard.",
        HTTP_STATUS.FORBIDDEN,
        "PUBLISH_REQUIRES_ADMIN_ROLE"
      );
    }

    const { version: versionParam } = await context.params;
    const version = Number(versionParam);
    if (!Number.isInteger(version) || version <= 0) {
      return apiError("El parámetro version debe ser un entero positivo.", HTTP_STATUS.BAD_REQUEST, "INVALID_VERSION");
    }

    const body = (await request.json().catch(() => null)) as PublishBody | null;
    const note = body?.note?.trim();
    if (!note) {
      return apiError(
        "Se requiere una nota de cambio (note) para publicar.",
        HTTP_STATUS.BAD_REQUEST,
        "NOTE_REQUIRED"
      );
    }

    const supabase = createSupabaseServiceRoleClient() as unknown as AnySupabaseClient;

    const { data: row, error: fetchError } = await (supabase.from("wizard_variable_sets") as any)
      .select(
        "id, org_id, version, status, note, simulated_at, created_by, created_at, loan_terms, qualification, banking_params, probabilities, assumptions"
      )
      .eq("org_id", MVP_ORG_ID)
      .eq("version", version)
      .maybeSingle();

    if (fetchError) {
      return apiError(fetchError.message, HTTP_STATUS.INTERNAL_SERVER_ERROR, "WIZARD_VARIABLES_FETCH_FAILED");
    }
    const targetRow = row as WizardVariableSetRow | null;
    if (!targetRow) {
      return apiError(`No existe la versión ${version}.`, HTTP_STATUS.NOT_FOUND, "WIZARD_VARIABLES_NOT_FOUND");
    }

    if (targetRow.status === "active") {
      return apiError(`La versión ${version} ya está activa.`, HTTP_STATUS.CONFLICT, "ALREADY_ACTIVE");
    }

    if (!targetRow.simulated_at) {
      return apiError(
        `La versión ${version} no ha sido simulada. Debes simularla antes de publicar.`,
        HTTP_STATUS.BAD_REQUEST,
        "NOT_SIMULATED"
      );
    }

    // Revalida contra el CONTENIDO ACTUAL de la fila en la base, no lo que
    // se validó al guardar el borrador -- pudo editarse directo en la base
    // entre medio.
    const structuralErrors = validateLoanTermTiersStructure(targetRow.loan_terms);
    const hardLimitErrors = validateVariableSetHardLimits(rowToVariableSet(targetRow));
    const revalidationErrors = [...structuralErrors, ...hardLimitErrors];
    if (revalidationErrors.length > 0) {
      return apiError(
        `La versión ${version} viola límites de negocio y no puede publicarse: ${revalidationErrors.join(" ")}`,
        HTTP_STATUS.BAD_REQUEST,
        "HARD_LIMIT_VIOLATION"
      );
    }

    const previousVersion = targetRow.version;
    let previousActiveVersion: number | null = null;
    {
      const { data: currentActive } = await (supabase.from("wizard_variable_sets") as any)
        .select("version")
        .eq("org_id", MVP_ORG_ID)
        .eq("status", "active")
        .maybeSingle();
      previousActiveVersion = currentActive?.version ?? null;
    }

    const { data: publishResult, error: publishError } = await (supabase as any).rpc("publish_wizard_variable_set", {
      p_org_id: MVP_ORG_ID,
      p_version: version,
      p_note: note,
    });

    if (publishError) {
      return apiError(
        `No se pudo publicar la versión ${version}: ${publishError.message}`,
        HTTP_STATUS.BAD_REQUEST,
        "PUBLISH_FAILED"
      );
    }

    await (supabase.from("audit_events") as any).insert({
      org_id: MVP_ORG_ID,
      entity_type: "wizard_variable_set",
      entity_id: targetRow.id,
      action: "wizard_variables_published",
      actor_user_id: auth.user.id,
      before: { activeVersion: previousActiveVersion },
      after: { activeVersion: previousVersion, note, publishedBy: auth.user.id },
    });

    return NextResponse.json({ variableSet: publishResult });
  }
);
