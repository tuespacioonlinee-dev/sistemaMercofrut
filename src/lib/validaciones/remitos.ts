import { z } from "zod"

export const esquemaCrearRemito = z.object({
  ventaId: z.string().min(1, "Seleccioná una venta"),
  observaciones: z.string().max(300).optional(),
})

export const esquemaAnularRemito = z.object({
  motivoAnulacion: z.string().min(1, "El motivo es obligatorio").max(300),
})

export type DatosCrearRemito = z.infer<typeof esquemaCrearRemito>
export type DatosAnularRemito = z.infer<typeof esquemaAnularRemito>

/** Formatea número de remito estilo AFIP: 0001-00000001 */
export function formatearNumeroRemito(puntoVenta: number, numero: number): string {
  const pv = String(puntoVenta).padStart(4, "0")
  const n = String(numero).padStart(8, "0")
  return `${pv}-${n}`
}
