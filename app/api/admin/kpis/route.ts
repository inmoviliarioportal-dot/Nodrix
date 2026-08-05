import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase";
import { apiError, requireRole, withErrorHandling, HTTP_STATUS } from "@/app/api/_shared";
import { MVP_ORG_ID } from "@/app/api/auth/_constants";
import { APPLICATION_STAGES } from "@/lib/leads";
import { UF_VALUE_CLP } from "@/lib/uf-preevaluation";

/**
 * GET /api/admin/kpis
 *
 * Agregación REAL (no mock) de métricas ejecutivas para /admin/dashboard --
 * reemplaza los datos hardcodeados de components/admin/types.ts. Todo se
 * calcula en memoria a partir de `applications` + `application_stage_history`
 * + `properties` + `users` (org fijo del MVP, ver MVP_ORG_ID), ya que el
 * volumen de datos del MVP no justifica funciones SQL agregadas dedicadas.
 *
 * "Ingresos este mes" es una PROYECCIÓN referencial: suma el precio en UF
 * (convertido a CLP con UF_VALUE_CLP, ver lib/uf-preevaluation.ts) de las
 * propiedades ligadas a solicitudes que llegaron a CIERRE este mes -- no un
 * valor de comisión real, porque el modelo de datos no guarda un % de
 * comisión. Se rotula como "gestionado", no "comisión", para no insinuar
 * un número que no podemos respaldar.
 *
 * Requiere admin/gerencia con el módulo "reportes" habilitado.
 */
export const GET = withErrorHandling(async () => {
  const auth = await requireRole(["admin", "gerencia"]);
  if (!auth.authorized) return auth.response;

  const supabase = createSupabaseServiceRoleClient() as any;

  const [applicationsRes, historyRes, propertiesRes, advisorsRes, customersRes] = await Promise.all([
    supabase
      .from("applications")
      .select(
        "id, customer_id, stage, scoring_category, assigned_advisor_id, selected_property_ids, accepted_housing_property_id, created_at, updated_at"
      )
      .eq("org_id", MVP_ORG_ID),
    supabase
      .from("application_stage_history")
      .select("application_id, to_stage, created_at")
      .order("created_at", { ascending: true }),
    supabase.from("properties").select("id, price_uf, available").eq("org_id", MVP_ORG_ID),
    supabase.from("users").select("id, full_name").eq("org_id", MVP_ORG_ID).eq("role", "asesor"),
    supabase.from("customers").select("id, name").eq("org_id", MVP_ORG_ID),
  ]);

  for (const res of [applicationsRes, historyRes, propertiesRes, advisorsRes, customersRes]) {
    if (res.error) {
      return apiError(res.error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR, "KPI_FETCH_FAILED");
    }
  }

  type AppRow = {
    id: string;
    customer_id: string;
    stage: string;
    scoring_category: string | null;
    assigned_advisor_id: string | null;
    selected_property_ids: string[] | null;
    accepted_housing_property_id: string | null;
    created_at: string;
    updated_at: string;
  };
  type HistoryRow = { application_id: string; to_stage: string; created_at: string };
  type PropertyRow = { id: string; price_uf: number; available: boolean };

  const applications: AppRow[] = applicationsRes.data ?? [];
  const history: HistoryRow[] = historyRes.data ?? [];
  const properties: PropertyRow[] = propertiesRes.data ?? [];
  const advisors: { id: string; full_name: string | null }[] = advisorsRes.data ?? [];
  const customers: { id: string; name: string }[] = customersRes.data ?? [];

  const customerNameById = new Map(customers.map((c) => [c.id, c.name]));
  const priceByPropertyId = new Map(properties.map((p) => [p.id, p.price_uf]));
  const advisorNameById = new Map(advisors.map((a) => [a.id, a.full_name ?? "Sin nombre"]));

  const now = Date.now();
  const DAY_MS = 86_400_000;
  const startOfThisMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const startOfLastMonth = new Date(startOfThisMonth.getFullYear(), startOfThisMonth.getMonth() - 1, 1);

  function daysBetween(a: string | Date | number, b: string | Date | number): number {
    return (new Date(b).getTime() - new Date(a).getTime()) / DAY_MS;
  }

  function estimatedUfForApplication(app: AppRow): number {
    const ids = [...(app.selected_property_ids ?? []), app.accepted_housing_property_id].filter(
      (id): id is string => Boolean(id)
    );
    return ids.reduce((sum, id) => sum + (priceByPropertyId.get(id) ?? 0), 0);
  }

  // ---------------------------------------------------------------------
  // KPI summary
  // ---------------------------------------------------------------------
  const leadsThisMonth = applications.filter((a) => new Date(a.created_at) >= startOfThisMonth).length;
  const leadsLastMonth = applications.filter(
    (a) => new Date(a.created_at) >= startOfLastMonth && new Date(a.created_at) < startOfThisMonth
  ).length;
  const leadsMomChangePct = leadsLastMonth > 0 ? ((leadsThisMonth - leadsLastMonth) / leadsLastMonth) * 100 : null;

  const closedApps = applications.filter((a) => a.stage === "CIERRE");
  const conversionRate = applications.length > 0 ? (closedApps.length / applications.length) * 100 : 0;

  const avgDaysToClose =
    closedApps.length > 0
      ? closedApps.reduce((sum, a) => sum + daysBetween(a.created_at, a.updated_at), 0) / closedApps.length
      : 0;

  const closedThisMonth = closedApps.filter((a) => new Date(a.updated_at) >= startOfThisMonth);
  const closedLastMonth = closedApps.filter(
    (a) => new Date(a.updated_at) >= startOfLastMonth && new Date(a.updated_at) < startOfThisMonth
  );
  const revenueThisMonthUf = closedThisMonth.reduce((sum, a) => sum + estimatedUfForApplication(a), 0);
  const revenueLastMonthUf = closedLastMonth.reduce((sum, a) => sum + estimatedUfForApplication(a), 0);
  const revenueThisMonth = Math.round(revenueThisMonthUf * UF_VALUE_CLP);
  const revenueLastMonth = Math.round(revenueLastMonthUf * UF_VALUE_CLP);
  const revenueMomChangePct =
    revenueLastMonth > 0 ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100 : null;

  // ---------------------------------------------------------------------
  // Funnel: cuántas solicitudes ALGUNA VEZ llegaron a cada etapa (usa el
  // historial real, no solo el stage actual -- así sí es un funnel
  // acumulativo genuino en vez de solo la foto del momento).
  // ---------------------------------------------------------------------
  const reachedStageByApp = new Map<string, Set<string>>();
  for (const row of history) {
    if (!reachedStageByApp.has(row.application_id)) reachedStageByApp.set(row.application_id, new Set());
    reachedStageByApp.get(row.application_id)!.add(row.to_stage);
  }
  // El historial puede no tener la entrada de creación (RECEPCIONADA) si la
  // application nació directo en ese stage sin fila de auditoría -- cada
  // application siempre "alcanzó" su propio stage actual como mínimo.
  for (const app of applications) {
    if (!reachedStageByApp.has(app.id)) reachedStageByApp.set(app.id, new Set());
    reachedStageByApp.get(app.id)!.add(app.stage);
  }

  const funnel = APPLICATION_STAGES.map((stage) => {
    const stageIndex = APPLICATION_STAGES.indexOf(stage);
    const count = applications.filter((app) => {
      const reached = reachedStageByApp.get(app.id);
      if (reached?.has(stage)) return true;
      // Si el stage actual está más avanzado que este, asumimos que lo
      // atravesó aunque falte la fila de historial correspondiente.
      return APPLICATION_STAGES.indexOf(app.stage as (typeof APPLICATION_STAGES)[number]) >= stageIndex;
    }).length;
    return { stage, count };
  });

  // ---------------------------------------------------------------------
  // Scoring distribution
  // ---------------------------------------------------------------------
  const scoringCategories = ["BRONCE", "PLATA", "ORO", "PLATINO", "BLACK"] as const;
  const withScoring = applications.filter((a) => a.scoring_category);
  const scoringDistribution = scoringCategories.map((category) => {
    const count = applications.filter((a) => a.scoring_category === category).length;
    return {
      category,
      count,
      percentage: withScoring.length > 0 ? Math.round((count / withScoring.length) * 1000) / 10 : 0,
    };
  });

  // ---------------------------------------------------------------------
  // Timeline: cierres por día, mes en curso
  // ---------------------------------------------------------------------
  const daysInMonth = new Date(startOfThisMonth.getFullYear(), startOfThisMonth.getMonth() + 1, 0).getDate();
  const closuresByDay = new Array(daysInMonth).fill(0);
  for (const row of history) {
    if (row.to_stage !== "CIERRE") continue;
    const d = new Date(row.created_at);
    if (d >= startOfThisMonth) {
      const dayIndex = d.getDate() - 1;
      if (dayIndex >= 0 && dayIndex < daysInMonth) closuresByDay[dayIndex] += 1;
    }
  }
  const timeline = closuresByDay.map((closures, i) => ({ day: i + 1, closures }));

  // ---------------------------------------------------------------------
  // Top leads: solicitudes activas (no CIERRE) con más días sin avanzar --
  // las que más urgen seguimiento, no un ranking arbitrario.
  // ---------------------------------------------------------------------
  const activeApps = applications.filter((a) => a.stage !== "CIERRE");
  const topLeads = [...activeApps]
    .map((a) => ({
      id: a.id,
      client: customerNameById.get(a.customer_id) ?? "Cliente sin nombre",
      category: a.scoring_category ?? "SIN_SCORING",
      stage: a.stage,
      daysInStage: Math.round(daysBetween(a.updated_at, now)),
    }))
    .sort((a, b) => b.daysInStage - a.daysInStage)
    .slice(0, 10);

  // ---------------------------------------------------------------------
  // Desviaciones: solicitudes activas cuyo tiempo en su etapa actual supera
  // 1.5x el promedio histórico REAL para esa etapa (calculado del propio
  // historial de transiciones, no un umbral inventado).
  // ---------------------------------------------------------------------
  const stageDurations: Record<string, number[]> = {};
  const historyByApp = new Map<string, HistoryRow[]>();
  for (const row of history) {
    if (!historyByApp.has(row.application_id)) historyByApp.set(row.application_id, []);
    historyByApp.get(row.application_id)!.push(row);
  }
  for (const [, rows] of historyByApp) {
    for (let i = 0; i < rows.length - 1; i++) {
      const stage = rows[i].to_stage;
      const duration = daysBetween(rows[i].created_at, rows[i + 1].created_at);
      if (!stageDurations[stage]) stageDurations[stage] = [];
      stageDurations[stage].push(duration);
    }
  }
  const avgDurationByStage: Record<string, number> = {};
  for (const [stage, durations] of Object.entries(stageDurations)) {
    avgDurationByStage[stage] = durations.reduce((s, d) => s + d, 0) / durations.length;
  }
  const FALLBACK_EXPECTED_DAYS = 5;
  const deviations = activeApps
    .map((a) => {
      const daysInStage = daysBetween(a.updated_at, now);
      const expectedDays = avgDurationByStage[a.stage] ?? FALLBACK_EXPECTED_DAYS;
      return {
        id: a.id,
        client: customerNameById.get(a.customer_id) ?? "Cliente sin nombre",
        stage: a.stage,
        daysInStage: Math.round(daysInStage),
        expectedDays: Math.round(expectedDays * 10) / 10,
        overByPct: expectedDays > 0 ? Math.round(((daysInStage - expectedDays) / expectedDays) * 100) : 0,
      };
    })
    .filter((d) => d.daysInStage > (avgDurationByStage[d.stage] ?? FALLBACK_EXPECTED_DAYS) * 1.5 && d.daysInStage >= 3)
    .sort((a, b) => b.overByPct - a.overByPct)
    .slice(0, 10);

  // ---------------------------------------------------------------------
  // Desempeño por asesor
  // ---------------------------------------------------------------------
  const advisorPerformance = advisors
    .map((advisor) => {
      const assigned = applications.filter((a) => a.assigned_advisor_id === advisor.id);
      const closures = assigned.filter((a) => a.stage === "CIERRE").length;
      return {
        advisor: advisorNameById.get(advisor.id) ?? "Sin nombre",
        leadsAssigned: assigned.length,
        closures,
        conversionRate: assigned.length > 0 ? Math.round((closures / assigned.length) * 1000) / 10 : 0,
      };
    })
    .filter((a) => a.leadsAssigned > 0)
    .sort((a, b) => b.closures - a.closures);

  // ---------------------------------------------------------------------
  // Inventario de propiedades
  // ---------------------------------------------------------------------
  const soldPropertyIds = new Set<string>();
  for (const app of closedApps) {
    for (const id of [...(app.selected_property_ids ?? []), app.accepted_housing_property_id]) {
      if (id) soldPropertyIds.add(id);
    }
  }
  const reservedPropertyIds = new Set<string>();
  for (const app of activeApps) {
    for (const id of [...(app.selected_property_ids ?? []), app.accepted_housing_property_id]) {
      if (id && !soldPropertyIds.has(id)) reservedPropertyIds.add(id);
    }
  }
  const propertiesInventory = {
    total: properties.length,
    available: properties.filter((p) => p.available && !reservedPropertyIds.has(p.id) && !soldPropertyIds.has(p.id))
      .length,
    reserved: reservedPropertyIds.size,
    sold: soldPropertyIds.size,
  };

  // ---------------------------------------------------------------------
  // Detalle de cierres del mes
  // ---------------------------------------------------------------------
  const closuresDetail = closedThisMonth
    .map((a) => ({
      id: a.id,
      client: customerNameById.get(a.customer_id) ?? "Cliente sin nombre",
      date: a.updated_at,
      uf: estimatedUfForApplication(a),
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return NextResponse.json({
    summary: {
      totalLeadsThisMonth: leadsThisMonth,
      leadsMomChangePct,
      conversionRate: Math.round(conversionRate * 10) / 10,
      avgDaysToClose: Math.round(avgDaysToClose),
      revenueThisMonth,
      revenueMomChangePct,
      totalApplications: applications.length,
      activeApplications: activeApps.length,
      closedThisMonthCount: closedThisMonth.length,
    },
    funnel,
    scoringDistribution,
    timeline,
    topLeads,
    deviations,
    advisorPerformance,
    propertiesInventory,
    closuresDetail,
  });
});
