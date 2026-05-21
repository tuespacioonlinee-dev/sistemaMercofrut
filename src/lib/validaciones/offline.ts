import { z } from "zod"

/** Heartbeat de un dispositivo. */
export const esquemaHeartbeat = z.object({
  fingerprint: z.string().min(8, "Fingerprint inválido").max(200),
  nombre:      z.string().max(120).optional(),
  estado:      z.enum(["ONLINE", "OFFLINE"]).default("ONLINE"),
})
export type DatosHeartbeat = z.infer<typeof esquemaHeartbeat>

/** Reservar un rango de números para uso offline. */
export const esquemaReservarRango = z.object({
  fingerprint: z.string().min(8).max(200),
  cantidad:    z.number().int().min(1).max(50).default(20),
  tipo:        z.enum(["REMITO", "FACTURA", "NOTA_CREDITO", "NOTA_DEBITO", "RECIBO"]).default("REMITO"),
  letra:       z.enum(["A", "B", "C", "X"]).default("X"),
})
export type DatosReservarRango = z.infer<typeof esquemaReservarRango>

/** Sincronizar una venta cargada en modo offline. */
export const lineaSyncSchema = z.object({
  productoId:     z.string().min(1),
  unidadId:       z.string().min(1),
  cantidad:       z.number().positive(),
  precioUnitario: z.number().min(0),
})

export const esquemaSincronizarVenta = z.object({
  fingerprint:             z.string().min(8).max(200),
  clienteId:               z.string().min(1, "Seleccioná un cliente"),
  detalles:                z.array(lineaSyncSchema).min(1, "Al menos una línea"),
  descuento:               z.number().min(0).default(0),
  observaciones:           z.string().max(500).trim().optional(),
  numeroReservadoToken:    z.string().min(1),
  numeroReservadoFormateado: z.string().regex(/^\d{4}-\d{8}$/, "Número con formato inválido"),
  clientRequestId:         z.string().uuid(),
  creadaEnOfflineISO:      z.string().datetime(),
})
export type DatosSincronizarVenta = z.infer<typeof esquemaSincronizarVenta>
