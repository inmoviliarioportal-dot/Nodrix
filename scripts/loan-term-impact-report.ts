#!/usr/bin/env node
/**
 * Informe de impacto — matriz v2 de plazo del crédito (loan_terms.tiers)
 * =============================================================================
 * SOLO LECTURA: no modifica ninguna fila. Lee todas las `applications`
 * activas (stage != 'CIERRE') con su `customer` (birth_date,
 * professional_level) y su `pre_evaluation_max_uf` actual, y recalcula cada
 * una con la matriz v2 en borrador (database/migrations/
 * 033_loan_term_tiers_v2.sql, status = 'draft', org MVP) para reportar:
 *
 *   - Cuántas solicitudes cambian de monto máximo calificable, y la
 *     variación promedio (UF).
 *   - Cuántas DEJAN de calificar (pasan a disqualifiedByAge, o el monto cae
 *     bajo minQualifyingUF).
 *   - Cuántas PASAN a calificar (antes no calificaban, ahora sí).
 *   - La mayor caída individual (UF).
 *   - Desglose por tramo de edad efectiva afectado.
 *
 * Reutiliza directamente `loanTermYearsFor` (lib/loan-term.ts) -- no
 * duplica esa lógica. La parte de anualidad/UF sí se recalcula acá con una
 * función mínima espejo de `calculateUFPreEvaluation` (lib/uf-preevaluation.ts),
 * porque ese cálculo necesita el `maxMonthlyInstallmentCLP` implícito del
 * `pre_evaluation_max_uf` ya persistido, no los inputs financieros crudos
 * (renta/deuda/ahorro no están en `applications`/`customers` de forma
 * completa y estable para reconstruirlos 1:1 -- ver nota en
 * `impliedMonthlyInstallmentFromMaxUF`).
 *
 * Este script es standalone (no depende de Next.js ni de rutas de la app),
 * mismo patrón de carga de env que scripts/seed-staff-users.mjs (lee
 * .env.local, usa @supabase/supabase-js directo con la service role key).
 * Es de SOLO LECTURA contra la base -- no hace ningún insert/update/upsert.
 *
 * Uso:
 *   npx tsx scripts/loan-term-impact-report.ts
 *
 * (El proyecto no tiene `tsx` como dependencia hoy -- si no está disponible,
 * instalar con `npm install -D tsx` antes de correr, o transpilar con
 * `npx ts-node` si se prefiere esa alternativa. El script no tiene ninguna
 * dependencia de Next.js/route handlers, así que corre standalone con
 * cualquiera de las dos.)
 *
 * Lee NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY desde .env.local
 * (o del entorno, ej. CI).
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { loanTermYearsFor } from "../lib/loan-term";
import type { ProfessionalLevel } from "../lib/proposal-risk";
import {
  ageTierLabel,
  impliedMonthlyInstallmentFromMaxUF,
  recalcMaxLoanUF,
  SIMULATION_ANNUAL_INTEREST_RATE,
  SIMULATION_FALLBACK_YEARS_V1,
  SIMULATION_MIN_QUALIFYING_UF,
  SIMULATION_UF_VALUE_CLP,
} from "../lib/loan-term-simulation";

function loadEnvLocal(): void {
  try {
    const content = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of content.split("\n")) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].trim();
      }
    }
  } catch {
    // .env.local not found — assume env vars are already set (e.g. CI).
  }
}

loadEnvLocal();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MVP_ORG_ID = "00000000-0000-0000-0000-000000000001";

// -----------------------------------------------------------------------------
// Fórmulas compartidas ahora viven en lib/loan-term-simulation.ts (usadas
// también por app/api/admin/wizard-variables/simulate/route.ts) -- este
// script solo reexpone los alias locales que usaba antes para no tocar el
// resto del archivo.
// -----------------------------------------------------------------------------
const MIN_QUALIFYING_UF = SIMULATION_MIN_QUALIFYING_UF;
const FALLBACK_YEARS_V1 = SIMULATION_FALLBACK_YEARS_V1;
void SIMULATION_UF_VALUE_CLP;
void SIMULATION_ANNUAL_INTEREST_RATE;

interface ApplicationRow {
  id: string;
  stage: string;
  pre_evaluation_max_uf: number | null;
  customer_id: string;
}

interface CustomerRow {
  id: string;
  birth_date: string | null;
  professional_level: string | null;
}

async function main(): Promise<void> {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (.env.local). No se pudo conectar a una base real desde este entorno."
    );
    console.error("El script queda completo y listo para correr cuando alguien lo autorice contra la base real:");
    console.error("  npx tsx scripts/loan-term-impact-report.ts");
    process.exitCode = 1;
    return;
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: applications, error } = await supabase
    .from("applications")
    .select("id, stage, pre_evaluation_max_uf, customer_id")
    .eq("org_id", MVP_ORG_ID)
    .neq("stage", "CIERRE");

  if (error) {
    console.error("Error leyendo applications:", error.message);
    process.exitCode = 1;
    return;
  }

  const apps = (applications ?? []) as ApplicationRow[];
  if (apps.length === 0) {
    console.log("No hay solicitudes activas para analizar.");
    return;
  }

  const customerIds = [...new Set(apps.map((a) => a.customer_id))];
  const { data: customers, error: custError } = await supabase
    .from("customers")
    .select("id, birth_date, professional_level")
    .in("id", customerIds);

  if (custError) {
    console.error("Error leyendo customers:", custError.message);
    process.exitCode = 1;
    return;
  }

  const customerById = new Map<string, CustomerRow>(
    ((customers ?? []) as CustomerRow[]).map((c) => [c.id, c])
  );

  let changed = 0;
  let deltaSumUF = 0;
  let newlyDisqualified = 0;
  let newlyQualified = 0;
  let maxDropUF = 0;
  let maxDropApplicationId: string | null = null;
  const byAgeTier = new Map<string, number>();

  for (const app of apps) {
    const customer = customerById.get(app.customer_id);
    const oldMaxUF = Number(app.pre_evaluation_max_uf ?? 0);

    const professionalLevel: ProfessionalLevel | null =
      customer?.professional_level === "profesional" || customer?.professional_level === "tecnico"
        ? (customer.professional_level as ProfessionalLevel)
        : null;

    const term = loanTermYearsFor({
      birthDate: customer?.birth_date ?? null,
      professionalLevel,
      avalBirthDate: null, // guarantors no guarda birth_date hoy (migración 017_guarantors.sql)
      fallbackYears: FALLBACK_YEARS_V1,
    });

    const impliedInstallment = impliedMonthlyInstallmentFromMaxUF(oldMaxUF);
    const newMaxUF = recalcMaxLoanUF(impliedInstallment, term.years);

    const wasQualified = oldMaxUF >= MIN_QUALIFYING_UF;
    const isQualified = newMaxUF >= MIN_QUALIFYING_UF;

    const delta = newMaxUF - oldMaxUF;
    if (Math.abs(delta) > 0.01) {
      changed += 1;
      deltaSumUF += delta;
    }
    if (delta < -maxDropUF) {
      maxDropUF = -delta;
      maxDropApplicationId = app.id;
    }
    if (wasQualified && (!isQualified || term.years === null)) newlyDisqualified += 1;
    if (!wasQualified && isQualified && term.years !== null) newlyQualified += 1;

    const tierLabel = ageTierLabel(term.effectiveAge);
    byAgeTier.set(tierLabel, (byAgeTier.get(tierLabel) ?? 0) + 1);
  }

  console.log(`Solicitudes activas analizadas: ${apps.length}`);
  console.log(`Cambian de monto: ${changed}`);
  console.log(`Variación promedio (UF): ${(deltaSumUF / (apps.length || 1)).toFixed(2)}`);
  console.log(`Dejan de calificar (nuevo disqualifiedByAge o cae bajo minQualifyingUF): ${newlyDisqualified}`);
  console.log(`Pasan a calificar: ${newlyQualified}`);
  console.log(
    `Mayor caída individual (UF): ${maxDropUF.toFixed(2)}${maxDropApplicationId ? ` (application ${maxDropApplicationId})` : ""}`
  );
  console.log("Desglose por tramo de edad efectiva:");
  for (const [tier, count] of byAgeTier.entries()) {
    console.log(`  ${tier}: ${count}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
