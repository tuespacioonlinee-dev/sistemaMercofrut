import { z } from "zod"
import { CondicionVenta } from "@prisma/client"

export const detalleVentaSchema = z.object({
  productoId: z.string().min(1, "Seleccioná un producto"),
  unidadId: z.string().min(1, "Seleccioná una unidad"),
  cantidad: z.number().min(0.001, "La cantidad debe ser mayor a 0"),
  precioUnitario: z.number().min(0, "No puede ser negativo"),
})

export const ventaSchema = z.object({
  clienteId: z.string().min(1, "Seleccioná un cliente"),
  condicion: z.nativeEnum(CondicionVenta),
  descuento: z.number().min(0),
  observaciones: z.string().max(500).trim().optional(),
  detalles: z.array(detalleVentaSchema).min(1, "Agregá al menos un producto"),
})

export type DetalleVentaInput = z.infer<typeof detalleVentaSchema>
export type VentaInput = z.infer<typeof ventaSchema>
