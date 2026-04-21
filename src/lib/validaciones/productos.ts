import { z } from "zod"

export const productoSchema = z.object({
  codigo: z.string().min(1, "El código es requerido").max(50).trim(),
  nombre: z.string().min(2, "Mínimo 2 caracteres").max(100).trim(),
  categoriaId: z.string().min(1, "Seleccioná una categoría"),
  unidadBaseId: z.string().min(1, "Seleccioná una unidad"),
  // z.number() + valueAsNumber en el input evita problemas de coerción con Zod v4
  precioVenta: z.number({ message: "Ingresá un precio válido" }).min(0, "No puede ser negativo"),
  precioCompra: z.number().min(0, "No puede ser negativo"),
  stockMinimo: z.number().min(0, "No puede ser negativo"),
  controlaVencimiento: z.boolean(),
})

export type ProductoInput = z.infer<typeof productoSchema>
