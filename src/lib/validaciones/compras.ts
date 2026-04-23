import { z } from "zod"
import { CondicionCompra, TipoComprobanteCompra } from "@prisma/client"

// Alícuotas de IVA vigentes según ARCA (ex-AFIP)
export const ALICUOTAS_IVA = [
  { valor: 0,    label: "0% — Exento / No gravado" },
  { valor: 2.5,  label: "2,5% — Tasa especial" },
  { valor: 5,    label: "5% — Tasa reducida" },
  { valor: 10.5, label: "10,5% — Tasa diferencial" },
  { valor: 21,   label: "21% — Tasa general" },
  { valor: 27,   label: "27% — Tasa incrementada" },
] as const

export type AlicuotaIVA = (typeof ALICUOTAS_IVA)[number]["valor"]

/** Dado un monto de IVA y un subtotal, devuelve la alícuota ARCA más cercana */
export function detectarAlicuota(ivaAmount: number, subtotal: number): AlicuotaIVA {
  if (subtotal <= 0 || ivaAmount <= 0) return 0
  const pct = (ivaAmount / subtotal) * 100
  let closest: (typeof ALICUOTAS_IVA)[number] = ALICUOTAS_IVA[0]
  for (const a of ALICUOTAS_IVA) {
    if (Math.abs(a.valor - pct) < Math.abs(closest.valor - pct)) closest = a
  }
  return closest.valor
}

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
  tipoComprobante: z.nativeEnum(TipoComprobanteCompra).optional(),
  numeroComprobante: z.string().max(50).trim().optional(),
  iva: z.number().min(0),
  descuento: z.number().min(0),
  observaciones: z.string().max(500).trim().optional(),
  detalles: z
    .array(detalleCompraSchema)
    .min(1, "Agregá al menos un producto"),
})

export type DetalleCompraInput = z.infer<typeof detalleCompraSchema>
export type CompraInput = z.infer<typeof compraSchema>

// Etiquetas legibles para el tipo de comprobante
export const etiquetasTipoComprobante: Record<TipoComprobanteCompra, string> = {
  FACTURA_A: "Factura A",
  FACTURA_B: "Factura B",
  FACTURA_C: "Factura C",
  FACTURA_E: "Factura E (Exportación)",
  REMITO:    "Remito",
  TICKET:    "Ticket",
  OTRO:      "Otro",
}
