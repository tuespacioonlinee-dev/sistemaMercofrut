import { z } from "zod"

export const esquemaCrearFactura = z.object({
  ventaId: z.string().min(1, "Seleccioná una venta"),
  remitoId: z.string().optional(),
})

export const esquemaAnularFactura = z.object({
  motivoAnulacion: z.string().min(1, "El motivo es obligatorio").max(300),
})

export type DatosCrearFactura = z.infer<typeof esquemaCrearFactura>
export type DatosAnularFactura = z.infer<typeof esquemaAnularFactura>

/** Formato AFIP: 0001-00000001 */
export function formatearNumeroFactura(puntoVenta: number, numero: number): string {
  return `${String(puntoVenta).padStart(4, "0")}-${String(numero).padStart(8, "0")}`
}

/** Tipo de factura según condición IVA del emisor y del cliente */
export function determinarTipoFactura(
  condicionEmisor: string,
  condicionCliente: string
): "A" | "B" | "C" {
  if (condicionEmisor === "MONOTRIBUTO") return "C"
  // Emisor RI
  if (condicionCliente === "RESPONSABLE_INSCRIPTO") return "A"
  return "B"
}

export const TASA_IVA = 0.21

/** IVA solo se discrimina en Factura A */
export function calcularIva(subtotal: number, tipo: "A" | "B" | "C"): number {
  if (tipo === "A") return Math.round(subtotal * TASA_IVA * 100) / 100
  return 0
}

export const etiquetasTipoFactura: Record<string, string> = {
  A: "Factura A",
  B: "Factura B",
  C: "Factura C",
  NOTA_CREDITO_A: "N. Crédito A",
  NOTA_CREDITO_B: "N. Crédito B",
  NOTA_CREDITO_C: "N. Crédito C",
  NOTA_DEBITO_A: "N. Débito A",
  NOTA_DEBITO_B: "N. Débito B",
  NOTA_DEBITO_C: "N. Débito C",
}

export const etiquetasCondicionIva: Record<string, string> = {
  RESPONSABLE_INSCRIPTO: "Responsable Inscripto",
  MONOTRIBUTO: "Monotributo",
  EXENTO: "Exento",
  CONSUMIDOR_FINAL: "Consumidor Final",
  NO_RESPONSABLE: "No Responsable",
}
