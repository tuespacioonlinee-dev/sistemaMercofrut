"use server"

import { revalidatePath } from "next/cache"
import { randomUUID } from "node:crypto"
import { prisma } from "@/lib/prisma"
import { requireRole, requireSession } from "@/lib/auth-guards"
import { OFFLINE_MODE_ENABLED } from "@/lib/feature-flags"
import {
  esquemaHeartbeat,
  esquemaReservarRango,
  esquemaSincronizarVenta,
} from "@/lib/validaciones/offline"
import {
  generarNumeroComprobante,
  obtenerPuntoVentaDefault,
} from "@/server/lib/numeracion"
import { registrarMovimientoCajaEnTx } from "@/server/actions/caja"
import { Prisma, RolUsuario } from "@prisma/client"

const ROLES_OFFLINE = [RolUsuario.ADMIN, RolUsuario.VENDEDOR] as const

/** TTL de cada reserva en milisegundos (24h). Local — no se puede exportar
 *  desde un archivo "use server" porque Next.js solo permite async functions. */
const RESERVA_TTL_MS = 24 * 60 * 60 * 1000

// ─────────────────────────────────────────────────────────────────────────────
// Helpers privados
// ─────────────────────────────────────────────────────────────────────────────

function ensureFlagActivo() {
  if (!OFFLINE_MODE_ENABLED) {
    return { error: "Modo offline deshabilitado en el server (OFFLINE_MODE_ENABLED=false)" }
  }
  return null
}

/**
 * Detecta errores de "tabla no existe" que ocurren cuando alguien activa el
 * flag sin haber corrido las migraciones del modo offline.
 *
 * Prisma lanza P2021 con `meta.table` indicando la tabla faltante.
 * También cubre P2022 (columna no existe) por las dudas.
 */
function esTablaOffline404(e: unknown): boolean {
  if (!(e instanceof Prisma.PrismaClientKnownRequestError)) return false
  if (e.code !== "P2021" && e.code !== "P2022") return false
  const meta = e.meta as { table?: string; column?: string } | undefined
  const ref = `${meta?.table ?? ""} ${meta?.column ?? ""}`
  return /DispositivoActivo|NumeroComprobanteReservado/i.test(ref)
}

/**
 * Mensaje legible cuando las migraciones del modo offline no se aplicaron.
 */
const MENSAJE_MIGRACIONES_FALTAN =
  "Modo offline: las migraciones de DB no están aplicadas en este servidor. " +
  "Pediles a quien deployó que corra `prisma migrate deploy`."

// ─────────────────────────────────────────────────────────────────────────────
// 1) Heartbeat — registra/actualiza el estado del dispositivo
// ─────────────────────────────────────────────────────────────────────────────

export async function heartbeat(input: unknown) {
  const flagError = ensureFlagActivo()
  if (flagError) return flagError

  const session = await requireSession()

  const parsed = esquemaHeartbeat.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  try {
    const dispositivo = await prisma.dispositivoActivo.upsert({
      where:  { fingerprint: parsed.data.fingerprint },
      update: {
        estado:          parsed.data.estado,
        ultimoHeartbeat: new Date(),
        nombre:          parsed.data.nombre ?? undefined,
      },
      create: {
        usuarioId:       session.user.id,
        fingerprint:     parsed.data.fingerprint,
        nombre:          parsed.data.nombre ?? null,
        estado:          parsed.data.estado,
      },
      select: { id: true, estado: true, ultimoHeartbeat: true },
    })
    return { ok: true, dispositivoId: dispositivo.id, estado: dispositivo.estado }
  } catch (e) {
    if (esTablaOffline404(e)) {
      return { error: MENSAJE_MIGRACIONES_FALTAN, migracionesFaltan: true }
    }
    throw e
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) Reservar un rango de números para uso offline
// ─────────────────────────────────────────────────────────────────────────────

export async function reservarRangoOffline(input: unknown) {
  const flagError = ensureFlagActivo()
  if (flagError) return flagError

  const session = await requireRole(...ROLES_OFFLINE)

  const parsed = esquemaReservarRango.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { fingerprint, cantidad, tipo, letra } = parsed.data
  const token = randomUUID()
  const ahora = new Date()
  const expiraEn = new Date(ahora.getTime() + RESERVA_TTL_MS)

  // Todo dentro de una sola transacción para que si algo falla,
  // ninguna secuencia avanza y ninguna reserva queda persistida.
  let reservas: Array<{
    token: string
    numero: number
    numeroFormateado: string
    tipo: typeof tipo
    letra: typeof letra
    puntoVenta: number
    expiraEn: Date
  }>
  try {
    reservas = await prisma.$transaction(async (tx) => {
    // Asegurar dispositivo
    const dispositivo = await tx.dispositivoActivo.upsert({
      where:  { fingerprint },
      update: { ultimoHeartbeat: ahora },
      create: {
        usuarioId:   session.user.id,
        fingerprint,
        estado:      "ONLINE",
      },
      select: { id: true },
    })

    const puntoVenta = await obtenerPuntoVentaDefault(tx)

    const filas: Array<{
      token: string
      numero: number
      numeroFormateado: string
      tipo: typeof tipo
      letra: typeof letra
      puntoVenta: number
      expiraEn: Date
    }> = []

    for (let i = 0; i < cantidad; i++) {
      const r = await generarNumeroComprobante(tx, { tipo, letra, puntoVenta })

      await tx.numeroComprobanteReservado.create({
        data: {
          tipo,
          letra,
          puntoVenta,
          numero:           r.valor,
          numeroFormateado: r.numero,
          token,
          dispositivoId:    dispositivo.id,
          usuarioId:        session.user.id,
          reservadoEn:      ahora,
          expiraEn,
        },
      })

      filas.push({
        token,
        numero:           r.valor,
        numeroFormateado: r.numero,
        tipo,
        letra,
        puntoVenta,
        expiraEn,
      })
    }

    return filas
    }, { maxWait: 10_000, timeout: 30_000 })
  } catch (e) {
    if (esTablaOffline404(e)) {
      return { error: MENSAJE_MIGRACIONES_FALTAN, migracionesFaltan: true }
    }
    throw e
  }

  return { ok: true, token, reservas }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) Sincronizar una venta cargada en modo offline
// ─────────────────────────────────────────────────────────────────────────────

export async function sincronizarVentaOffline(input: unknown) {
  const flagError = ensureFlagActivo()
  if (flagError) return flagError

  const session = await requireRole(...ROLES_OFFLINE)

  const parsed = esquemaSincronizarVenta.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const {
    fingerprint,
    clienteId,
    detalles,
    descuento,
    observaciones,
    numeroReservadoToken,
    numeroReservadoFormateado,
    clientRequestId,
  } = parsed.data

  // Pre-cargar productos y factores de conversión (fuera de la tx para acortarla).
  const productosIds = [...new Set(detalles.map((d) => d.productoId))]
  const unidadesIds  = [...new Set(detalles.map((d) => d.unidadId))]
  const [productosUnidades, productos] = await Promise.all([
    prisma.productoUnidad.findMany({
      where: { productoId: { in: productosIds }, unidadId: { in: unidadesIds } },
    }),
    prisma.producto.findMany({ where: { id: { in: productosIds } } }),
  ])

  // Verificar productos existan
  for (const d of detalles) {
    if (!productos.find((p) => p.id === d.productoId)) {
      return { error: `Producto ${d.productoId} no existe o fue eliminado` }
    }
  }

  const detallesConBase = detalles.map((d) => {
    const pu = productosUnidades.find((p) => p.productoId === d.productoId && p.unidadId === d.unidadId)
    const factor = pu ? Number(pu.factor) : 1
    return {
      ...d,
      cantidadBase: d.cantidad * factor,
      subtotal:     d.cantidad * d.precioUnitario,
    }
  })

  const subtotal = detallesConBase.reduce((acc, d) => acc + d.subtotal, 0)
  const total = subtotal - descuento

  let ventaId: string
  let remitoId: string
  let yaSincronizada = false

  try {
    await prisma.$transaction(async (tx) => {
    // Idempotency: si clientRequestId ya existe, retornar la venta existente.
    const existente = await tx.venta.findUnique({
      where: { clientRequestId },
      include: { remitos: { take: 1, orderBy: { fecha: "desc" } } },
    })
    if (existente) {
      ventaId = existente.id
      const r = existente.remitos[0]
      if (r) remitoId = r.id
      yaSincronizada = true
      return
    }

    // Validar la reserva
    const dispositivo = await tx.dispositivoActivo.findUnique({
      where: { fingerprint },
      select: { id: true, usuarioId: true },
    })
    if (!dispositivo) {
      throw new Error("Dispositivo no registrado — heartbeat previo requerido")
    }

    const reservas = await tx.numeroComprobanteReservado.findMany({
      where: {
        token:             numeroReservadoToken,
        numeroFormateado:  numeroReservadoFormateado,
      },
    })
    if (reservas.length === 0) {
      throw new Error("Número reservado no encontrado")
    }
    const reserva = reservas[0]
    if (reserva.consumido) {
      throw new Error("Número reservado ya consumido por otra venta")
    }
    if (reserva.expiraEn < new Date()) {
      throw new Error(`Reserva expirada el ${reserva.expiraEn.toISOString()}`)
    }
    if (reserva.dispositivoId !== dispositivo.id) {
      throw new Error("Reserva pertenece a otro dispositivo")
    }
    if (reserva.usuarioId !== session.user.id) {
      throw new Error("Reserva pertenece a otro usuario")
    }

    // Buscar/crear cuenta CONTADO del cliente (offline solo permite CONTADO)
    let cuenta = await tx.cuenta.findFirst({
      where: { clienteId, tipo: "CONTADO", deletedAt: null },
    })
    if (!cuenta) {
      const cliente = await tx.cliente.findUnique({ where: { id: clienteId } })
      if (!cliente) throw new Error("Cliente no existe o fue eliminado")
      cuenta = await tx.cuenta.create({
        data: {
          nombre:    `Contado - ${cliente.nombreRazonSocial}`,
          tipo:      "CONTADO",
          titular:   "CLIENTE",
          clienteId,
        },
      })
    }

    // Crear venta
    const venta = await tx.venta.create({
      data: {
        clienteId,
        cuentaId:  cuenta.id,
        condicion: "CONTADO",
        subtotal,
        descuento,
        total,
        observaciones:   observaciones ?? null,
        creadaPorId:     session.user.id,
        clientRequestId,
        detalles: {
          create: detallesConBase.map((d) => ({
            productoId:     d.productoId,
            unidadId:       d.unidadId,
            cantidad:       d.cantidad,
            cantidadBase:   d.cantidadBase,
            precioUnitario: d.precioUnitario,
            subtotal:       d.subtotal,
          })),
        },
      },
    })
    ventaId = venta.id

    // Stock — decrement atómico (sin FIFO de lotes para mantener el alcance acotado)
    for (const d of detallesConBase) {
      const updated = await tx.producto.update({
        where: { id: d.productoId },
        data:  { stockTotal: { decrement: d.cantidadBase } },
        select: { stockTotal: true },
      })
      const stockPosterior = Number(updated.stockTotal)
      const stockAnterior  = stockPosterior + d.cantidadBase

      await tx.movimientoStock.create({
        data: {
          productoId:    d.productoId,
          tipo:          "EGRESO_VENTA",
          cantidad:      d.cantidadBase,
          stockAnterior,
          stockPosterior,
          usuarioId:     session.user.id,
          origenTipo:    "venta",
          origenId:      venta.id,
        },
      })
    }

    // Cuenta corriente — DEBE
    const cuentaActualizada = await tx.cuenta.update({
      where: { id: cuenta.id },
      data:  { saldo: { increment: total } },
      select: { saldo: true },
    })
    const saldoPosterior = Number(cuentaActualizada.saldo)
    const saldoAnterior  = saldoPosterior - total

    await tx.movimientoCuenta.create({
      data: {
        cuentaId:      cuenta.id,
        tipo:          "DEBE",
        monto:         total,
        saldoAnterior,
        saldoPosterior,
        descripcion:   `Venta #${venta.numero} (sincronizada offline)`,
        usuarioId:     session.user.id,
        origenTipo:    "venta",
        origenId:      venta.id,
      },
    })

    // Crear remito con el NÚMERO RESERVADO (no se llama al helper de numeración)
    const remito = await tx.remito.create({
      data: {
        numero:     reserva.numeroFormateado,
        puntoVenta: reserva.puntoVenta,
        ventaId:    venta.id,
        estado:     "EMITIDO",
      },
    })
    remitoId = remito.id

    // Marcar la reserva como consumida
    await tx.numeroComprobanteReservado.update({
      where: { id: reserva.id },
      data:  { consumido: true, ventaIdConsumida: venta.id },
    })

    // Movimiento de caja (si hay caja abierta)
    await registrarMovimientoCajaEnTx(tx, {
      tipo:        "CONTADO_HABER",
      categoria:   "VENTA_CONTADO",
      monto:       total,
      descripcion: `Venta #${venta.numero} — Remito ${reserva.numeroFormateado} (offline sync)`,
      usuarioId:   session.user.id,
      origenTipo:  "venta",
      origenId:    venta.id,
    })

      // Nota: el campo DispositivoActivo.ventasOfflinePendientes queda en su
      // valor por defecto (0). Como las ventas offline viven en IndexedDB del
      // cliente, el server no las cuenta proactivamente — cada dispositivo ve
      // sus propios pendientes desde Dexie. Si en el futuro queremos exponerlo
      // server-side, agregaríamos un endpoint que el cliente llama al cargar.
    }, { maxWait: 10_000, timeout: 30_000 })
  } catch (e) {
    if (esTablaOffline404(e)) {
      return { error: MENSAJE_MIGRACIONES_FALTAN, migracionesFaltan: true }
    }
    throw e
  }

  revalidatePath("/ventas")
  revalidatePath("/remitos")
  revalidatePath("/stock")
  revalidatePath("/cuentas")
  revalidatePath("/caja")

  return { ok: true, ventaId: ventaId!, remitoId: remitoId!, yaSincronizada }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) Liberar reservas expiradas (cron / job)
// ─────────────────────────────────────────────────────────────────────────────

export async function liberarReservasExpiradas() {
  const flagError = ensureFlagActivo()
  if (flagError) return flagError

  await requireSession()

  try {
    const r = await prisma.numeroComprobanteReservado.deleteMany({
      where: { consumido: false, expiraEn: { lt: new Date() } },
    })

    // Además, marcar como OFFLINE dispositivos sin heartbeat reciente (>5 min)
    const limite = new Date(Date.now() - 5 * 60 * 1000)
    const d = await prisma.dispositivoActivo.updateMany({
      where: { estado: "ONLINE", ultimoHeartbeat: { lt: limite } },
      data:  { estado: "OFFLINE" },
    })

    return { ok: true, reservasLiberadas: r.count, dispositivosMarcadosOffline: d.count }
  } catch (e) {
    if (esTablaOffline404(e)) {
      return { error: MENSAJE_MIGRACIONES_FALTAN, migracionesFaltan: true }
    }
    throw e
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) Estado de lock multi-dispositivo
// ─────────────────────────────────────────────────────────────────────────────

export async function obtenerEstadoLockMultiDispositivo(fingerprintActual: string) {
  if (!OFFLINE_MODE_ENABLED) {
    return { otrosDispositivosOffline: false, dispositivos: [] }
  }
  await requireSession()

  try {
    const otros = await prisma.dispositivoActivo.findMany({
      where: {
        fingerprint: { not: fingerprintActual },
        estado:      "OFFLINE",
      },
      select: { fingerprint: true, nombre: true, ultimoHeartbeat: true, ventasOfflinePendientes: true },
    })

    return {
      otrosDispositivosOffline: otros.length > 0,
      dispositivos: otros,
    }
  } catch (e) {
    // Si las migraciones faltan, degradamos sin romper la UI:
    // tratamos como "no hay otros dispositivos offline".
    if (esTablaOffline404(e)) {
      return { otrosDispositivosOffline: false, dispositivos: [], migracionesFaltan: true as const }
    }
    throw e
  }
}
