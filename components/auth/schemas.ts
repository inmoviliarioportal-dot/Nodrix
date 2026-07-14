import { z } from "zod"

import { isValidRut } from "@/lib/rut"

/**
 * Esquemas de validación compartidos por register/login.
 * Mensajes en español (Chile) para mostrar directamente en la UI.
 */

export const GENDER_OPTIONS = [
  { value: "femenino", label: "Femenino" },
  { value: "masculino", label: "Masculino" },
  { value: "otro", label: "Otro" },
  { value: "prefiero_no_decir", label: "Prefiero no decir" },
] as const

export const INVESTMENT_TYPE_OPTIONS = [
  { value: "inversion", label: "Inversión" },
  { value: "vivienda_propia", label: "Vivienda propia" },
] as const

export const PROPERTY_STATUS_OPTIONS = [
  { value: "en_verde", label: "En verde (planos)" },
  { value: "en_blanco", label: "En blanco (construcción)" },
  { value: "usado", label: "Usado" },
  { value: "sin_definir", label: "Aún no lo sé" },
] as const

export const registerSchema = z.object({
  firstName: z.string().trim().min(2, "Ingresa tu nombre"),
  lastName: z.string().trim().min(2, "Ingresa tu apellido"),
  rut: z
    .string()
    .trim()
    .toUpperCase()
    .refine((value) => isValidRut(value), "RUT inválido (verifica el dígito verificador)"),
  gender: z.enum(["femenino", "masculino", "otro", "prefiero_no_decir"], {
    message: "Selecciona una opción",
  }),
  birthDate: z
    .string()
    .min(1, "Ingresa tu fecha de nacimiento")
    .refine((value) => !Number.isNaN(new Date(value).getTime()), "Fecha inválida"),
  age: z.coerce
    .number({ message: "Ingresa tu edad" })
    .int("La edad debe ser un número entero")
    .min(18, "Debes ser mayor de edad")
    .max(120, "Ingresa una edad válida"),
  phone: z
    .string()
    .trim()
    .min(8, "Ingresa un teléfono válido")
    .regex(/^[0-9+\s()-]+$/, "Ingresa un teléfono válido"),
  email: z.string().trim().email("Ingresa un correo válido"),
  monthlyIncome: z.coerce
    .number({ message: "Ingresa tu renta líquida mensual" })
    .min(0, "La renta no puede ser negativa"),
  investmentType: z.enum(["inversion", "vivienda_propia"], {
    message: "Selecciona una opción",
  }),
  propertyStatus: z.enum(["en_verde", "en_blanco", "usado", "sin_definir"], {
    message: "Selecciona una opción",
  }),
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
