"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"

import { Layout } from "@/components/Layout"
import { Toaster } from "@/components/ui/sonner"
import { ReportFilters, type ReportFiltersState } from "@/components/admin/ReportFilters"
import { ExportButtons } from "@/components/admin/ExportButtons"
import { ReportSections } from "@/components/admin/ReportSections"

const DEFAULT_FILTERS: ReportFiltersState = {
  from: "",
  to: "",
  advisor: "Todos",
  stage: "Todos",
  category: "Todas",
}

/**
 * Reportes exportables (Release 3). Los filtros son puramente decorativos
 * sobre data mock por ahora (ver `components/admin/types.ts`) — cuando
 * existan endpoints agregados, este estado pasa a disparar un fetch real.
 * Layout print-friendly: 100% de ancho, sin sidebars adicionales.
 */
export default function AdminReportsPage() {
  const [filters, setFilters] = React.useState<ReportFiltersState>(DEFAULT_FILTERS)

  return (
    <Layout>
      <Toaster />
      <div className="bg-deep-ambient -mx-6 -my-8 min-h-[calc(100vh-4rem)] px-6 py-8 print:m-0 print:bg-none print:p-0">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 print:max-w-full">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
            <div className="flex items-center gap-3">
              <Link
                href="/admin/dashboard"
                className="rounded-lg p-2 text-text-tertiary transition-colors duration-200 hover:bg-glass hover:text-text-primary"
                title="Volver al dashboard"
              >
                <ArrowLeftIcon className="size-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Reportes</h1>
                <p className="text-sm text-text-tertiary">
                  Reportes ejecutivos exportables — data mock, Release 3
                </p>
              </div>
            </div>
            <ExportButtons />
          </div>

          <ReportFilters value={filters} onChange={setFilters} />

          <ReportSections />
        </div>
      </div>
    </Layout>
  )
}
