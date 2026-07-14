import { getPasswordStrength } from "@/lib/passwordStrength"
import { cn } from "@/lib/utils"

const BAR_COLORS: Record<number, string> = {
  0: "bg-error",
  1: "bg-error",
  2: "bg-warning",
  3: "bg-neon-cyan",
  4: "bg-neon-green",
}

const LABEL_COLORS: Record<number, string> = {
  0: "text-error",
  1: "text-error",
  2: "text-warning",
  3: "text-neon-cyan",
  4: "text-neon-green",
}

/** Indicador visual de fuerza de contraseña — 4 barras + etiqueta, usado en
 * registro y cambio de contraseña. No se muestra si el campo está vacío. */
function PasswordStrengthMeter({ password }: { password: string }) {
  if (!password) return null

  const { score, label } = getPasswordStrength(password)

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className={cn(
              "h-1 flex-1 rounded-full bg-glass-border transition-colors duration-200",
              index < score && BAR_COLORS[score]
            )}
          />
        ))}
      </div>
      <span className={cn("text-xs", LABEL_COLORS[score])}>{label}</span>
    </div>
  )
}

export { PasswordStrengthMeter }
