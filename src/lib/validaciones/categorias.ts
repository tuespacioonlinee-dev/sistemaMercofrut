import { z } from "zod"

export const categoriaSchema = z.object({
  nombre: z
    .string()
    .min(2, "Mínimo 2 caracteres")
    .max(50, "Máximo 50 caracteres")
    .trim(),
})

export type CategoriaInput = z.infer<typeof categoriaSchema>
