import { z } from "zod"

// Requisitos mínimos de una contraseña nueva. Apuntamos a algo seguro pero
// realista para usuarios no técnicos: 8+ caracteres, al menos una letra y un número.
export const passwordNuevaSchema = z
  .string()
  .min(8, "Mínimo 8 caracteres")
  .max(100, "Máximo 100 caracteres")
  .regex(/[A-Za-z]/, "Debe incluir al menos una letra")
  .regex(/[0-9]/, "Debe incluir al menos un número")

export const cambiarPasswordSchema = z
  .object({
    passwordActual: z.string().min(1, "Ingresá tu contraseña actual"),
    passwordNueva: passwordNuevaSchema,
    confirmar: z.string().min(1, "Repetí la contraseña nueva"),
  })
  .refine((d) => d.passwordNueva === d.confirmar, {
    message: "Las contraseñas no coinciden",
    path: ["confirmar"],
  })
  .refine((d) => d.passwordNueva !== d.passwordActual, {
    message: "La nueva contraseña debe ser distinta a la actual",
    path: ["passwordNueva"],
  })

export type CambiarPasswordInput = z.infer<typeof cambiarPasswordSchema>
