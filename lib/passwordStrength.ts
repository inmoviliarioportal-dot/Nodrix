/**
 * Heurística simple de fuerza de contraseña (sin dependencias externas):
 * puntúa longitud + variedad de caracteres. No pretende ser un análisis
 * criptográfico riguroso (tipo zxcvbn) — suficiente para dar feedback
 * visual inmediato al usuario en registro/cambio de contraseña.
 */
export type PasswordStrengthLevel = "muy_debil" | "debil" | "media" | "fuerte" | "muy_fuerte";

export interface PasswordStrengthResult {
  score: number; // 0-4
  level: PasswordStrengthLevel;
  label: string;
}

const LEVELS: { level: PasswordStrengthLevel; label: string }[] = [
  { level: "muy_debil", label: "Muy débil" },
  { level: "debil", label: "Débil" },
  { level: "media", label: "Media" },
  { level: "fuerte", label: "Fuerte" },
  { level: "muy_fuerte", label: "Muy fuerte" },
];

export function getPasswordStrength(password: string): PasswordStrengthResult {
  if (!password) {
    return { score: 0, level: "muy_debil", label: LEVELS[0].label };
  }

  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;

  // Penaliza patrones obvios (todo igual, secuencias comunes).
  if (/^(.)\1+$/.test(password) || /^(1234|12345|123456|abcdef|password|qwerty)/i.test(password)) {
    score = Math.max(0, score - 2);
  }

  const clamped = Math.min(4, score);
  return { score: clamped, level: LEVELS[clamped].level, label: LEVELS[clamped].label };
}
