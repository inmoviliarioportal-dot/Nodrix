import Link from "next/link"
import { FileBarChart2Icon } from "lucide-react"

import { Layout } from "@/components/Layout"
import { KpiCards } from "@/components/admin/KpiCards"
import { ConversionFunnel } from "@/components/admin/ConversionFunnel"
import { ScoringDistribution } from "@/components/admin/ScoringDistribution"
import { ConversionTimeline } from "@/components/admin/ConversionTimeline"
import { TopLeadsTable } from "@/components/admin/TopLeadsTable"

export const metadata = {
  title: "Dashboard Ejecutivo — Nodrix",
}

/**
 * Admin Dashboard (Release 3) — KPIs + Funnels.
 * Toda la data es MOCK hasta que existan endpoints agregados (ej.
 * `/api/admin/kpis`); ver `components/admin/types.ts` para la fuente única.
 */
export default function AdminDashboardPage() {
  return (
    <Layout navLinks={[{ href: "/admin/dashboard", label: "KPIs" }, { href: "/admin/reports", label: "Reportes" }]}>
      <div className="bg-deep-ambient -mx-6 -my-8 min-h-[calc(100vh-4rem)] px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
                Dashboard Ejecutivo
              </h1>
              <p className="text-sm text-text-tertiary">
                Visión general del pipeline — KPIs, funnel y scoring (data mock, Release 3)
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

          <KpiCards />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <ConversionFunnel />
            </div>
            <ScoringDistribution />
          </div>

          <ConversionTimeline />

          <TopLeadsTable />
        </div>
      </div>
    </Layout>
  )
}
