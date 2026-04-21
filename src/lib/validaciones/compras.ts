import { z } from "zod"
import { CondicionCompra } from "@prisma/client"

export const detalleCompraSchema = z.object({
  productoId: z.string().min(1, "Seleccioná un producto"),
  unidadId: z.string().min(1, "Seleccioná una unidad"),
  cantidad: z.number().min(0.001, "La cantidad debe ser mayor a 0"),
  precioUnitario: z.number().min(0, "No puede ser negativo"),
  // Lote — solo para productos con controlaVencimiento
  numeroLote: z.string().max(50).trim().optional(),
  fechaVencimiento: z.string().optional(), // ISO date string "YYYY-MM-DD"
})

export const compraSchema = z.object({
  proveedorId: z.string().min(1, "Seleccioná un proveedor"),
  condicion: z.nativeEnum(CondicionCompra),
  numeroComprobante: z.string().max(50).trim().optional(),
  observaciones: z.string().max(500).trim().optional(),
  descuento: z.number().min(0),
  detalles: z
    .array(detalleCompraSchema)
    .min(1, "Agregá al menos un producto"),
})

export type DetalleCompraInput = z.infer<typeof detalleCompraSchema>
export type CompraInput = z.infer<typeof compraSchema>
