import { z } from "zod"

export const esquemaAperturaCaja = z.object({
  saldoInicial: z.number().min(0, "El saldo inicial no puede ser negativo"),
  observaciones: z.string().max(500).optional(),
})

export const esquemaCierreCaja = z.object({
  saldoArqueo: z.number().min(0, "El saldo del arqueo no puede ser negativo"),
  observaciones: z.string().max(500).optional(),
})

export const esquemaMovimientoCaja = z.object({
  tipo: z.enum(["INGRESO", "EGRESO"]),
  categoria: z.enum([
    "VENTA_CONTADO",
    "COBRO_CLIENTE",
    "PAGO_PROVEEDOR",
    "COMPRA_CONTADO",
    "GASTO",
    "RETIRO",
    "DEPOSITO",
    "OTRO",
  ]),
  monto: z.number().min(0.01, "El monto debe ser mayor a 0"),
  descripcion: z.string().min(1, "La descripción es obligatoria").max(200),
})

export type DatosAperturaCaja = z.infer<typeof esquemaAperturaCaja>
export type DatosCierreCaja = z.infer<typeof esquemaCierreCaja>
export type DatosMovimientoCaja = z.infer<typeof esquemaMovimientoCaja>

export const etiquetasCategoria: Record<string, string> = {
  VENTA_CONTADO: "Venta al contado",
  COBRO_CLIENTE: "Cobro a cliente",
  PAGO_PROVEEDOR: "Pago a proveedor",
  COMPRA_CONTADO: "Compra al contado",
  GASTO: "Gasto",
  RETIRO: "Retiro",
  DEPOSITO: "Depósito",
  OTRO: "Otro",
}

// Qué categorías son INGRESO y cuáles EGRESO (para auto-completar el tipo)
export const categoriasTipo: Record<string, "INGRESO" | "EGRESO"> = {
  VENTA_CONTADO: "INGRESO",
  COBRO_CLIENTE: "INGRESO",
  DEPOSITO: "INGRESO",
  PAGO_PROVEEDOR: "EGRESO",
  COMPRA_CONTADO: "EGRESO",
  GASTO: "EGRESO",
  RETIRO: "EGRESO",
  OTRO: "INGRESO",
}
