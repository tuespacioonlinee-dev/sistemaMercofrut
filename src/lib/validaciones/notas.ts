import { z } from "zod"

export const lineaNotaSchema = z.object({
  productoId:            z.string().min(1, "Seleccioná un producto"),
  unidadId:              z.string().min(1, "Seleccioná una unidad"),
  cantidad:              z.number().positive("La cantidad debe ser mayor a 0"),
  precioUnitario:        z.number().min(0, "El precio no puede ser negativo"),
  generaMovimientoStock: z.boolean(),
})

export const notaSchema = z.object({
  tipo:           z.enum(["CREDITO", "DEBITO"]),
  letra:          z.enum(["A", "B", "C", "X"]).default("X"),
  ventaOrigenId:  z.string().min(1, "Seleccioná la venta de origen"),
  motivo:         z.string().min(3, "Indicá el motivo (mínimo 3 caracteres)").max(500),
  lineas:         z.array(lineaNotaSchema).min(1, "Agregá al menos una línea"),
  clientRequestId: z.string().uuid().optional(),
})

export const esquemaAnularNota = z.object({
  motivoAnulacion: z.string().min(1, "El motivo es obligatorio").max(300),
})

export type LineaNotaInput = z.infer<typeof lineaNotaSchema>
export type NotaInput      = z.infer<typeof notaSchema>
export type DatosAnularNota = z.infer<typeof esquemaAnularNota>
