import Link from "next/link"
import { FileBarChart2Icon } from "lucide-react"

import { AdminKpiDashboard } from "@/components/admin/AdminKpiDashboard"

export const metadata = {
  title: "Dashboard Ejecutivo — Nodrix",
}

/**
 * Admin Dashboard (Release 3) — KPIs, funnel, scoring, desviaciones,
 * desempeño por asesor e inventario, todo calculado en vivo desde la base
 * de datos (ver GET /api/admin/kpis y AdminKpiDashboard).
 */
export default function AdminDashboardPage() {
  return (
    <>
      <div className="bg-deep-ambient -mx-6 -my-8 min-h-[calc(100vh-4rem)] px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="font-heading text-2xl font-semibold tracking-tight text-text-primary">
                Dashboard Ejecutivo
              </h1>
              <p className="text-sm text-text-tertiary">
                Visión general del pipeline — KPIs, funnel, scoring, desviaciones y desempeño, en vivo
              </p>
            </div>
            <Link
              href="/admin/reports"
              className="glow-purple inline-flex w-fit items-center gap-2 rounded-lg border border-glass-border bg-glass px-3.5 py-2 text-sm font-medium text-text-primary transition-transform duration-200 hover:-translate-y-0.5"
            >
              <FileBarChart2Icon className="size-4 text-neon-purple" />
              Ver reportes
            </Link>
          </div>

          <AdminKpiDashboard />
        </div>
      </div>
    </>
  )
}
