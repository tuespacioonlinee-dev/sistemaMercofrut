import { z } from "zod"

// ─────────────────────────────────────────────────────────────────────────────
// Enums y mapeos
// ─────────────────────────────────────────────────────────────────────────────

export const TIPOS_MOV_CAJA = ["CONTADO_DEBE", "CONTADO_HABER", "CC_DEBE", "CC_HABER"] as const
export type TipoMovCaja = (typeof TIPOS_MOV_CAJA)[number]

export const CATEGORIAS_MOV_CAJA = [
  "VENTA_CONTADO",
  "COBRO_CLIENTE",
  "PAGO_PROVEEDOR",
  "COMPRA_CONTADO",
  "GASTO",
  "RETIRO",
  "DEPOSITO",
  "OTRO",
] as const
export type CategoriaMovCaja = (typeof CATEGORIAS_MOV_CAJA)[number]

/** Etiquetas visibles para el usuario */
export const etiquetasCategoria: Record<CategoriaMovCaja, string> = {
  VENTA_CONTADO:  "Venta contado",
  COBRO_CLIENTE:  "Cobro cliente (CC)",
  PAGO_PROVEEDOR: "Pago proveedor (CC)",
  COMPRA_CONTADO: "Compra contado",
  GASTO:          "Gasto",
  RETIRO:         "Retiro",
  DEPOSITO:       "Depósito",
  OTRO:           "Otro",
}

export const etiquetasTipo: Record<TipoMovCaja, string> = {
  CONTADO_DEBE:  "Contado DEBE",
  CONTADO_HABER: "Contado HABER",
  CC_DEBE:       "CC DEBE",
  CC_HABER:      "CC HABER",
}

/**
 * Mapeo automático categoría → tipo contable.
 * null = el usuario elige DEBE/HABER (solo para OTRO, siempre contado).
 */
export const categoriaATipo: Record<CategoriaMovCaja, TipoMovCaja | null> = {
  VENTA_CONTADO:  "CONTADO_HABER",
  COBRO_CLIENTE:  "CC_HABER",
  PAGO_PROVEEDOR: "CC_DEBE",
  COMPRA_CONTADO: "CONTADO_DEBE",
  GASTO:          "CONTADO_DEBE",
  RETIRO:         "CONTADO_DEBE",
  DEPOSITO:       "CONTADO_HABER",
  OTRO:           null,
}

/**
 * Resuelve el TipoMovCaja final.
 * Para OTRO: ladoOtro determina CONTADO_DEBE o CONTADO_HABER.
 */
export function resolverTipoMovCaja(
  categoria: CategoriaMovCaja,
  ladoOtro?: "DEBE" | "HABER"
): TipoMovCaja {
  const tipo = categoriaATipo[categoria]
  if (tipo !== null) return tipo
  return ladoOtro === "HABER" ? "CONTADO_HABER" : "CONTADO_DEBE"
}

// ─────────────────────────────────────────────────────────────────────────────
// Schemas Zod
// ─────────────────────────────────────────────────────────────────────────────

export const esquemaAperturaCaja = z.object({
  saldoInicial: z.number().min(0, "El saldo inicial no puede ser negativo"),
  observaciones: z.string().max(300).optional(),
})

export const esquemaCierreCaja = z.object({
  saldoArqueo: z.number().min(0, "El arqueo no puede ser negativo"),
  observaciones: z.string().max(300).optional(),
})

export const esquemaMovimientoCaja = z.object({
  categoria: z.enum(CATEGORIAS_MOV_CAJA),
  /** Solo requerido cuando categoria === "OTRO" */
  ladoOtro: z.enum(["DEBE", "HABER"]).optional(),
  monto: z.number().min(0.01, "El monto debe ser mayor a 0"),
  descripcion: z.string().min(1, "La descripción es obligatoria").max(200),
})

export type DatosAperturaCaja   = z.infer<typeof esquemaAperturaCaja>
export type DatosCierreCaja     = z.infer<typeof esquemaCierreCaja>
export type DatosMovimientoCaja = z.infer<typeof esquemaMovimientoCaja>
