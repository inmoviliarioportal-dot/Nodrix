import { Info, CheckCircle2, AlertTriangle } from "lucide-react"

import { cn } from "@/lib/utils"
import type { AlertTone } from "./stageContent"

const TONE_CONFIG: Record<
  AlertTone,
  { icon: typeof Info; wrapper: string; icon_: string }
> = {
  info: {
    icon: Info,
    wrapper: "border-neon-cyan/30 bg-neon-cyan/5",
    icon_: "text-neon-cyan",
  },
  success: {
    icon: CheckCircle2,
    wrapper: "border-neon-green/30 bg-neon-green/5",
    icon_: "text-neon-green",
  },
  warning: {
    icon: AlertTriangle,
    wrapper: "border-warning/30 bg-warning/5",
    icon_: "text-warning",
  },
}

/**
 * Banner de alerta contextual mostrado en el dashboard del cliente según la
 * etapa actual de su solicitud (ver `stageContent.ts`).
 */
function StageAlert({ tone, message }: { tone: AlertTone; message: string }) {
  const config = TONE_CONFIG[tone]
  const Icon = config.icon

  return (
    <div className={cn("glass-card flex items-start gap-3 rounded-xl border p-4", config.wrapper)}>
      <Icon className={cn("mt-0.5 size-5 shrink-0", config.icon_)} aria-hidden="true" />
      <p className="text-sm leading-relaxed text-text-primary">{message}</p>
    </div>
  )
}

export { StageAlert }
