// Nota: no usamos `import "server-only"` porque el helper recibe `tx`
// (Prisma.TransactionClient) por parámetro, lo cual ya garantiza que solo
// se invoca en el server (no hay PrismaClient en el browser). Esto además
// permite testear el helper con Vitest sin tener que mockear "server-only".
import type { Prisma, TipoComprobante, LetraComprobante } from "@prisma/client"

/**
 * Formatea PV y número estilo AFIP: "0001-00000123".
 *  - PV se completa con ceros a 4 dígitos
 *  - número con ceros a 8 dígitos
 *  - separados por guion
 */
export function formatearNumero(puntoVenta: number, numero: number): string {
  return `${String(puntoVenta).padStart(4, "0")}-${String(numero).padStart(8, "0")}`
}

/**
 * Genera el próximo número de comprobante para la combinación
 * (tipo, letra, puntoVenta) y lo devuelve formateado.
 *
 * **DEBE invocarse dentro de un `prisma.$transaction`** — el llamador pasa `tx`.
 *
 * Atomicidad: el `upsert` se apoya en el unique constraint
 * `(tipo, letra, puntoVenta)`. Postgres serializa las transacciones que apuntan
 * a la misma fila (row lock), así que llamadas concurrentes obtienen números
 * únicos y consecutivos sin colisión.
 *
 * Lazy creation: si la secuencia no existe (ej. primer comprobante en un PV
 * nuevo), `upsert` la crea con `ultimoNumero = 1` (el primer número emitido).
 * Si la transacción hace rollback, la creación también se revierte.
 *
 * Rollback: si la `$transaction` falla DESPUÉS del increment, el contador
 * NO queda incrementado.
 */
export async function generarNumeroComprobante(
  tx: Prisma.TransactionClient,
  opts: {
    tipo: TipoComprobante
    letra: LetraComprobante
    puntoVenta: number
  },
): Promise<{ numero: string; valor: number }> {
  const { tipo, letra, puntoVenta } = opts

  const secuencia = await tx.secuenciaComprobante.upsert({
    where: { tipo_letra_puntoVenta: { tipo, letra, puntoVenta } },
    update: { ultimoNumero: { increment: 1 } },
    create: { tipo, letra, puntoVenta, ultimoNumero: 1 },
    select: { ultimoNumero: true },
  })

  return {
    valor: secuencia.ultimoNumero,
    numero: formatearNumero(puntoVenta, secuencia.ultimoNumero),
  }
}

/**
 * Devuelve el PV default del negocio leyendo `ParametrosComprobante`.
 * Si no hay registro (entorno fresh), crea uno con PV = 1.
 *
 * Diseñado para llamarse dentro de la misma `$transaction` que va a generar
 * el número, así no hay race condition con la creación del registro.
 */
export async function obtenerPuntoVentaDefault(
  tx: Prisma.TransactionClient,
): Promise<number> {
  const params = await tx.parametrosComprobante.findFirst()
  if (params) return params.puntoVenta
  const creado = await tx.parametrosComprobante.create({ data: { puntoVenta: 1 } })
  return creado.puntoVenta
}
