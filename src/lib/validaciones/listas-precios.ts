import { z } from "zod"

export const listaPrecioSchema = z.object({
  nombre:      z.string().min(2, "Mínimo 2 caracteres").max(60).trim(),
  descripcion: z.string().max(200).trim().optional().or(z.literal("")),
  esDefault:   z.boolean().optional(),
})

export type ListaPrecioInput = z.infer<typeof listaPrecioSchema>

export const precioProductoSchema = z.object({
  productoId: z.string().min(1),
  precio:     z.number().min(0, "El precio no puede ser negativo"),
})

export const actualizarPreciosListaSchema = z.object({
  listaPrecioId: z.string().min(1),
  precios:       z.array(precioProductoSchema).min(1),
})

export type ActualizarPreciosListaInput = z.infer<typeof actualizarPreciosListaSchema>
