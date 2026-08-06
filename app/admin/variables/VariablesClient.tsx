"use client"

import * as React from "react"
import { toast } from "sonner"

import { Toaster } from "@/components/ui/sonner"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  LoanTermTiersEditor,
  validateTierRows,
  type TiersByLevel,
} from "@/components/admin/variables/LoanTermTiersEditor"
import { QualificationEditor, type QualificationValue } from "@/components/admin/variables/QualificationEditor"
import { BankingParamsEditor, type BankingParamsValue } from "@/components/admin/variables/BankingParamsEditor"
import { ProbabilitiesEditor, type ProbabilitiesValue } from "@/components/admin/variables/ProbabilitiesEditor"
import { AssumptionsEditor, type AssumptionsValue } from "@/components/admin/variables/AssumptionsEditor"
import { VersionHistoryTable, type VersionListItem } from "@/components/admin/variables/VersionHistoryTable"
import { SimulationResultPanel, type SimulationResult } from "@/components/admin/variables/SimulationResultPanel"

interface VariableSetDetail {
  id: string
  org_id: string
  version: number
  status: "draft" | "active" | "archived" | "default"
  note: string | null
  simulated_at: string | null
  created_by: string | null
  created_at: string
  loan_terms: { maxAgeAtApplication: number; fallbackYears: number; tiers: Partial<TiersByLevel> }
  qualification: Partial<QualificationValue>
  banking_params: Partial<BankingParamsValue>
  probabilities: Partial<ProbabilitiesValue>
  assumptions: Partial<AssumptionsValue>
}

const EMPTY_TIERS: TiersByLevel = { profesional: [], tecnico: [] }

// Defaults defensivos -- si una versión antigua o corrupta no trae alguno de
// estos campos, el formulario no debe reventar: rellena con la forma
// esperada y deja los números en 0 para que sea obvio que hay que revisarlos.
const DEFAULT_QUALIFICATION: QualificationValue = { minQualifyingUF: 0, minQualifyingTotalIncomeCLP: 0 }
const DEFAULT_BANKING_PARAMS: BankingParamsValue = {
  minRentaDividendoRatio: 0,
  cargaFinancieraTiers: [],
  leverageTiers: [],
  shortTermDebtAmortizationMonths: 0,
}
const DEFAULT_PROBABILITIES: ProbabilitiesValue = {
  bandDifficulty: {},
  professionalLevelProbabilityCap: {},
  pensionAgeTiers: [],
}
const DEFAULT_ASSUMPTIONS: AssumptionsValue = { annualInterestRate: 0 }

export default function VariablesPage() {
  const [role, setRole] = React.useState<string | null>(null)
  const [permissionLevel, setPermissionLevel] = React.useState<"none" | "view" | "edit">("none")

  const [versions, setVersions] = React.useState<VersionListItem[]>([])
  const [loadingVersions, setLoadingVersions] = React.useState(true)

  const [detail, setDetail] = React.useState<VariableSetDetail | null>(null)
  const [selectedVersion, setSelectedVersion] = React.useState<number | null>(null)
  const [loadingDetail, setLoadingDetail] = React.useState(false)

  // Estado editable local -- separado de `detail` para poder detectar
  // "hay cambios sin guardar" antes de enviar al backend.
  const [tiers, setTiers] = React.useState<TiersByLevel>(EMPTY_TIERS)
  const [fallbackYears, setFallbackYears] = React.useState(25)
  const [maxAgeAtApplication, setMaxAgeAtApplication] = React.useState(65)
  const [qualification, setQualification] = React.useState<QualificationValue>(DEFAULT_QUALIFICATION)
  const [bankingParams, setBankingParams] = React.useState<BankingParamsValue>(DEFAULT_BANKING_PARAMS)
  const [probabilities, setProbabilities] = React.useState<ProbabilitiesValue>(DEFAULT_PROBABILITIES)
  const [assumptions, setAssumptions] = React.useState<AssumptionsValue>(DEFAULT_ASSUMPTIONS)

  const [savingDraft, setSavingDraft] = React.useState(false)
  const [simulating, setSimulating] = React.useState(false)
  const [publishing, setPublishing] = React.useState(false)
  const [publishNote, setPublishNote] = React.useState("")
  const [simulationResult, setSimulationResult] = React.useState<SimulationResult | null>(null)

  const isAdmin = role === "admin"
  const canEdit = permissionLevel === "edit"

  const loadVersions = React.useCallback(() => {
    setLoadingVersions(true)
    fetch("/api/admin/wizard-variables")
      .then(async (res) => {
        const data = await res.json().catch(() => null)
        if (!res.ok) {
          // No tragarse el error como si fuera "lista vacía" -- sin esto un
          // 500 real se ve idéntico a "todavía no hay versiones", que es
          // justo lo que pasó cuando el join a `users` tenía una columna
          // que no existe (name en vez de full_name).
          toast.error(data?.error ?? "No se pudo cargar el historial de versiones.")
          return null
        }
        return data
      })
      .then((data) => setVersions(data?.versions ?? []))
      .finally(() => setLoadingVersions(false))
  }, [])

  const loadDetail = React.useCallback((version: number) => {
    setLoadingDetail(true)
    setSimulationResult(null)
    fetch(`/api/admin/wizard-variables/${version}`)
      .then(async (res) => {
        const data = await res.json().catch(() => null)
        if (!res.ok) {
          toast.error(data?.error ?? `No se pudo cargar la versión ${version}.`)
          return null
        }
        return data
      })
      .then((data) => {
        const vs = data?.variableSet as VariableSetDetail | undefined
        if (!vs) return
        setDetail(vs)
        setSelectedVersion(vs.version)
        setTiers({
          profesional: vs.loan_terms?.tiers?.profesional ?? [],
          tecnico: vs.loan_terms?.tiers?.tecnico ?? [],
        })
        setFallbackYears(vs.loan_terms?.fallbackYears ?? 25)
        setMaxAgeAtApplication(vs.loan_terms?.maxAgeAtApplication ?? 65)
        setQualification({ ...DEFAULT_QUALIFICATION, ...vs.qualification })
        setBankingParams({ ...DEFAULT_BANKING_PARAMS, ...vs.banking_params })
        setProbabilities({ ...DEFAULT_PROBABILITIES, ...vs.probabilities })
        setAssumptions({ ...DEFAULT_ASSUMPTIONS, ...vs.assumptions })
        setPublishNote("")
      })
      .finally(() => setLoadingDetail(false))
  }, [])

  React.useEffect(() => {
    loadVersions()
    fetch("/api/auth/user")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setRole(data?.role ?? null)
        setPermissionLevel(data?.permissions?.variables ?? "none")
      })
      .catch(() => {})
  }, [loadVersions])

  // Al cargar el historial por primera vez: si hay un borrador, ábrelo; si
  // no, abre la versión activa (de solo lectura hasta que se cree un
  // borrador nuevo guardando cambios).
  React.useEffect(() => {
    if (loadingVersions || versions.length === 0 || selectedVersion !== null) return
    const draft = versions.find((v) => v.status === "draft")
    const active = versions.find((v) => v.status === "active")
    const target = draft ?? active ?? versions[0]
    if (target) loadDetail(target.version)
  }, [loadingVersions, versions, selectedVersion, loadDetail])

  const draftVersionEntry = versions.find((v) => v.status === "draft")
  const isEditingDraft = detail?.status === "draft"

  function buildTierValidationErrors(): string[] {
    return [
      ...validateTierRows("Profesional", tiers.profesional),
      ...validateTierRows("Técnico", tiers.tecnico),
    ]
  }

  async function handleSaveDraft() {
    const tierErrors = buildTierValidationErrors()
    if (tierErrors.length > 0) {
      toast.error(tierErrors[0])
      return
    }

    setSavingDraft(true)
    try {
      const payload = {
        loanTerms: {
          maxAgeAtApplication,
          fallbackYears,
          tiers: {
            ...(tiers.profesional.length > 0 ? { profesional: tiers.profesional } : {}),
            ...(tiers.tecnico.length > 0 ? { tecnico: tiers.tecnico } : {}),
          },
        },
        qualification,
        bankingParams,
        probabilities,
        assumptions,
      }

      const res = await fetch("/api/admin/wizard-variables/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        toast.error(data?.error ?? "No se pudo guardar el borrador.")
        return
      }
      toast.success(`Borrador v${data.variableSet.version} guardado. Debes simular antes de publicar.`)
      setSimulationResult(null)
      loadVersions()
      loadDetail(data.variableSet.version)
    } finally {
      setSavingDraft(false)
    }
  }

  async function handleSimulate() {
    if (!detail || detail.status !== "draft") {
      toast.error("Solo se puede simular un borrador. Guarda cambios primero.")
      return
    }
    setSimulating(true)
    try {
      const res = await fetch("/api/admin/wizard-variables/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftVersion: detail.version }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        toast.error(data?.error ?? "No se pudo simular el impacto.")
        return
      }
      setSimulationResult(data as SimulationResult)
      toast.success("Simulación completada.")
      loadVersions()
      // Refresca el detalle para que `simulated_at` quede actualizado (habilita publicar).
      loadDetail(detail.version)
    } finally {
      setSimulating(false)
    }
  }

  async function handlePublish() {
    if (!detail) return
    setPublishing(true)
    try {
      const res = await fetch(`/api/admin/wizard-variables/${detail.version}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: publishNote }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        toast.error(data?.error ?? "No se pudo publicar la versión.")
        return
      }
      toast.success(`Versión ${detail.version} publicada.`)
      loadVersions()
      loadDetail(detail.version)
    } finally {
      setPublishing(false)
    }
  }

  async function handleCreateDraftFromCurrent() {
    // Reusa el contenido actualmente cargado (ej. de la versión activa) y
    // lo guarda como borrador nuevo -- primer paso cuando no hay borrador.
    await handleSaveDraft()
  }

  const canPublish =
    isAdmin && isEditingDraft && !!detail?.simulated_at && publishNote.trim().length > 0 && !publishing

  return (
    <div className="flex flex-col gap-6">
      <Toaster />
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold text-text-primary">Variables del wizard</h1>
        <p className="text-sm text-text-secondary">
          Ajusta los parámetros financieros que usa el motor de pre-evaluación (plazo del crédito, calificación,
          gates bancarios, probabilidades y supuestos). Cada cambio se guarda como borrador, se simula contra las
          solicitudes activas y solo un administrador puede publicarlo.
        </p>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <h2 className="mb-4 font-heading text-sm font-semibold uppercase tracking-wide text-text-tertiary">
          Historial de versiones
        </h2>
        {loadingVersions ? (
          <p className="text-sm text-text-tertiary">Cargando...</p>
        ) : (
          <VersionHistoryTable versions={versions} selectedVersion={selectedVersion} onSelect={loadDetail} />
        )}
        {!draftVersionEntry && !loadingVersions && (
          <p className="mt-3 text-xs text-text-tertiary">
            No hay un borrador abierto. Edita los valores abajo (se precargaron desde la versión activa) y guarda
            para crear el borrador v{(versions[0]?.version ?? 0) + 1}.
          </p>
        )}
      </div>

      {!canEdit ? (
        <div className="glass-card rounded-2xl p-6 text-sm text-text-secondary">
          Tu rol tiene acceso de solo lectura al módulo de Variables. Solo puedes ver el historial arriba.
        </div>
      ) : loadingDetail || !detail ? (
        <div className="glass-card rounded-2xl p-6 text-sm text-text-tertiary">Cargando editor...</div>
      ) : (
        <>
          <div className="glass-card rounded-2xl p-6">
            <div className="mb-4 flex flex-col gap-1">
              <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-text-tertiary">
                Plazo del crédito -- tramos por edad y nivel profesional
              </h2>
              <p className="text-xs text-text-tertiary">
                Edad al último pago = edad máxima del tramo + plazo. Se marca en rojo si supera 80 (límite duro de
                negocio, el backend rechaza el borrador si algún tramo lo excede).
              </p>
            </div>
            <div className="mb-4 flex flex-wrap gap-4">
              <Field className="w-40">
                <FieldLabel htmlFor="fallbackYears">Plazo fallback (años)</FieldLabel>
                <Input
                  id="fallbackYears"
                  type="number"
                  className="bg-surface-elevated border-glass-border"
                  value={fallbackYears}
                  onChange={(e) => setFallbackYears(Number(e.target.value))}
                />
              </Field>
              <Field className="w-40">
                <FieldLabel htmlFor="maxAge">Edad máxima al solicitar</FieldLabel>
                <Input
                  id="maxAge"
                  type="number"
                  className="bg-surface-elevated border-glass-border"
                  value={maxAgeAtApplication}
                  onChange={(e) => setMaxAgeAtApplication(Number(e.target.value))}
                />
              </Field>
            </div>
            <LoanTermTiersEditor tiers={tiers} onChange={setTiers} />
          </div>

          <div className="glass-card rounded-2xl p-6">
            <h2 className="mb-4 font-heading text-sm font-semibold uppercase tracking-wide text-text-tertiary">
              Calificación y parámetros bancarios
            </h2>
            <div className="flex flex-col gap-8">
              <QualificationEditor value={qualification} onChange={setQualification} />
              <BankingParamsEditor value={bankingParams} onChange={setBankingParams} />
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6">
            <h2 className="mb-4 font-heading text-sm font-semibold uppercase tracking-wide text-text-tertiary">
              Probabilidades y supuestos
            </h2>
            <div className="flex flex-col gap-8">
              <ProbabilitiesEditor value={probabilities} onChange={setProbabilities} />
              <AssumptionsEditor value={assumptions} onChange={setAssumptions} />
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                disabled={savingDraft}
                onClick={handleSaveDraft}
                className="glow-cyan bg-neon-cyan text-deep hover:bg-neon-cyan/90 w-fit"
              >
                {savingDraft ? "Guardando..." : "Guardar borrador"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={simulating || !isEditingDraft}
                onClick={handleSimulate}
                className="w-fit"
              >
                {simulating ? "Simulando..." : "Simular impacto"}
              </Button>
            </div>
            {!isEditingDraft && (
              <p className="mt-2 text-xs text-text-tertiary">
                Estás viendo la versión {detail.status} (v{detail.version}), de solo lectura. Guarda cambios para
                crear un borrador editable.
              </p>
            )}

            {simulationResult && (
              <div className="mt-6 border-t border-glass-border pt-6">
                <h3 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wide text-text-tertiary">
                  Resultado de la simulación
                </h3>
                <SimulationResultPanel result={simulationResult} />
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 border-t border-glass-border pt-6">
              <h3 className="font-heading text-sm font-semibold uppercase tracking-wide text-text-tertiary">
                Publicar
              </h3>
              {!isAdmin ? (
                <p className="text-sm text-text-secondary">
                  Solo un administrador puede publicar una versión. Puedes guardar y simular el borrador, pero la
                  publicación queda deshabilitada para tu rol.
                </p>
              ) : (
                <>
                  <Field className="max-w-md">
                    <FieldLabel htmlFor="publishNote">Nota de cambio</FieldLabel>
                    <Input
                      id="publishNote"
                      className="bg-surface-elevated border-glass-border"
                      value={publishNote}
                      onChange={(e) => setPublishNote(e.target.value)}
                      placeholder="Ej: ajusta tramos de plazo para técnicos 55-60"
                    />
                  </Field>
                  {isEditingDraft && !detail.simulated_at && (
                    <p className="text-xs text-status-warning">
                      Debes simular el impacto de este borrador antes de poder publicarlo.
                    </p>
                  )}
                  <Button
                    type="button"
                    disabled={!canPublish}
                    onClick={handlePublish}
                    className="w-fit bg-status-success text-deep hover:bg-status-success/90"
                  >
                    {publishing ? "Publicando..." : `Publicar versión ${detail.version}`}
                  </Button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
