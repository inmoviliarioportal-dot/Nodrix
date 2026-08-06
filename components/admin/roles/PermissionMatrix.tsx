"use client"

import * as React from "react"

import { NAV_ITEMS, NAV_REGISTRY } from "@/lib/nav-registry"
// SOLO tipos de lib/permissions: ese módulo importa el cliente de Supabase de
// servidor (createSupabaseServiceRoleClient), así que un import de VALOR acá
// arrastraría "next/headers" al bundle de este Client Component y rompe el
// build ("You're importing a module that depends on next/headers..."). Los
// valores (PERMISSION_MODULES/labels) se derivan en cambio de NAV_ITEMS
// (lib/nav-registry.ts), que no tiene dependencias de servidor -- es la misma
// fuente de la que lib/permissions.ts los deriva.
import type { PermissionLevel, PermissionMap, PermissionModule } from "@/lib/permissions"
import { cn } from "@/lib/utils"

/** Espejo client-safe de `PERMISSION_MODULES` (lib/permissions.ts). */
export const PERMISSION_MODULES: readonly PermissionModule[] = NAV_ITEMS.map((item) => item.key)

/** Espejo client-safe de `PERMISSION_MODULE_LABELS` (lib/permissions.ts). */
export const PERMISSION_MODULE_LABELS = Object.fromEntries(
  NAV_ITEMS.map((item) => [item.key, item.permissionLabel])
) as Record<PermissionModule, string>

/**
 * Matriz de permisos reutilizable, agrupada visualmente igual que el menú de
 * /admin (Dashboard / Asesor / Propiedades / Usuarios / Wizard). Deriva sus
 * filas de `NAV_REGISTRY` -- agregar una vista nueva al registro la hace
 * aparecer sola acá, sin tocar este componente ni sus consumidores.
 */

export const LEVEL_OPTIONS: { value: PermissionLevel; label: string }[] = [
  { value: "none", label: "Sin acceso" },
  { value: "view", label: "Ver" },
  { value: "edit", label: "Editar" },
]

/** Construye un mapa de permisos con el mismo nivel para todos los módulos
 * del registro real -- reemplaza los `EMPTY_PERMISSIONS`/`GERENCIA_EDIT_ALL`
 * hardcodeados que antes vivían en RolesClient.tsx. */
export function buildPermissionMap(level: PermissionLevel): PermissionMap {
  return Object.fromEntries(PERMISSION_MODULES.map((module) => [module, level])) as PermissionMap
}

export function PermissionMatrix({
  permissions,
  onChange,
  disabled = false,
  name,
}: {
  permissions: PermissionMap
  onChange?: (module: PermissionModule, level: PermissionLevel) => void
  disabled?: boolean
  /** Prefijo único para el `name` de los radios -- evita colisiones cuando
   * hay varias matrices en la misma página (asesor, gerencia, admin, etc). */
  name: string
}) {
  return (
    <div className="flex flex-col gap-5">
      {NAV_REGISTRY.map((group) => (
        <div key={group.label}>
          <h4 className="mb-2 text-xs font-semibold tracking-wide text-text-tertiary uppercase">{group.label}</h4>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-sm">
              <thead>
                <tr className="border-glass-border text-text-tertiary border-b text-left text-xs tracking-wide uppercase">
                  <th className="py-2 pr-2">Vista</th>
                  {LEVEL_OPTIONS.map((opt) => (
                    <th key={opt.value} className="px-2 py-2 text-center">
                      {opt.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {group.items.map((item) => (
                  <tr key={item.key} className="border-glass-border/50 border-b">
                    <td className="py-2 pr-2 text-text-secondary">{item.permissionLabel}</td>
                    {LEVEL_OPTIONS.map((opt) => (
                      <td key={opt.value} className="px-2 py-2 text-center">
                        <input
                          type="radio"
                          name={`${name}-${item.key}`}
                          checked={permissions[item.key] === opt.value}
                          disabled={disabled}
                          onChange={() => onChange?.(item.key, opt.value)}
                          className={cn("size-4 accent-neon-cyan", disabled && "opacity-40")}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}
