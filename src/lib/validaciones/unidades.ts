import { z } from "zod"

export const unidadSchema = z.object({
  nombre: z
    .string()
    .min(2, "Mínimo 2 caracteres")
    .max(50, "Máximo 50 caracteres")
    .trim(),
  abreviatura: z
    .string()
    .min(1, "Requerida")
    .max(10, "Máximo 10 caracteres")
    .trim(),
})

export type UnidadInput = z.infer<typeof unidadSchema>
