import { z } from "zod"

/**
 * Esquemas de validación compartidos por register/login.
 * Mensajes en español (Chile) para mostrar directamente en la UI.
 */
export const registerSchema = z.object({
  name: z.string().trim().min(2, "Ingresa tu nombre completo"),
  email: z.string().trim().email("Ingresa un correo válido"),
  phone: z
    .string()
    .trim()
    .min(8, "Ingresa un teléfono válido")
    .regex(/^[0-9+\s()-]+$/, "Ingresa un teléfono válido"),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres"),
})

export type RegisterFormData = z.infer<typeof registerSchema>

export const loginSchema = z.object({
  email: z.string().trim().email("Ingresa un correo válido"),
  password: z.string().min(1, "Ingresa tu contraseña"),
})

export type LoginFormData = z.infer<typeof loginSchema>
