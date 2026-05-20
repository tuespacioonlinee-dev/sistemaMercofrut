"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { notaSchema, esquemaAnularNota } from "@/lib/validaciones/notas"
import { generarNumeroComprobante, obtenerPuntoVentaDefault } from "@/server/lib/numeracion"
import { requireRole, requireSession } from "@/lib/auth-guards"
import { RolUsuario } from "@prisma/client"

const ROLES_NOTAS = [RolUsuario.ADMIN, RolUsuario.VENDEDOR] as const

// ─────────────────────────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────────────────────────

export async function obtenerNotasPorVenta(ventaId: string) {
  await requireSession()
  return prisma.notaCreditoDebito.findMany({
    where: { ventaOrigenId: ventaId, deletedAt: null },
    orderBy: { fecha: "desc" },
    select: {
      id: true, numero: true, tipo: true, letra: true,
      fecha: true, montoTotal: true, estado: true, motivo: true,
    },
  })
}

export async function obtenerNotaPorId(id: string) {
  await requireSession()
  return prisma.notaCreditoDebito.findFirst({
    where: { id, deletedAt: null },
    include: {
      cliente:     { select: { id: true, nombreRazonSocial: true, documento: true } },
      ventaOrigen: { select: { id: true, numero: true } },
      creadaPor:   { select: { nombre: true } },
      lineas: {
        include: {
          producto: { select: { nombre: true, codigo: true } },
          unidad:   { select: { abreviatura: true } },
        },
      },
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Emitir nota
// ─────────────────────────────────────────────────────────────────────────────

export async function emitirNota(data: unknown) {
  const session = await requireRole(...ROLES_NOTAS)

  const parsed = notaSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { tipo, letra, ventaOrigenId, motivo, lineas, clientRequestId } = parsed.data

  // Cargar venta + cliente + cuenta CC (para validaciones)
  const venta = await prisma.venta.findUnique({
    where: { id: ventaOrigenId },
    include: { cliente: true, cuenta: true },
  })
  if (!venta) return { error: "Venta de origen no encontrada" }
  if (venta.estado === "ANULADA") return { error: "No se pueden emitir notas sobre una venta anulada" }

  // Cargar productos para factor de conversión
  const productosIds = [...new Set(lineas.map((l) => l.productoId))]
  const unidadesIds  = [...new Set(lineas.map((l) => l.unidadId))]
  const [productos, productosUnidades] = await Promise.all([
    prisma.producto.findMany({ where: { id: { in: productosIds } } }),
    prisma.productoUnidad.findMany({
      where: { productoId: { in: productosIds }, unidadId: { in: unidadesIds } },
    }),
  ])

  const lineasConBase = lineas.map((l) => {
    const pu = productosUnidades.find((p) => p.productoId === l.productoId && p.unidadId === l.unidadId)
    const factor = pu ? Number(pu.factor) : 1
    return {
      ...l,
      cantidadBase: l.cantidad * factor,
      subtotal:     l.cantidad * l.precioUnitario,
    }
  })

  const montoTotal = lineasConBase.reduce((acc, l) => acc + l.subtotal, 0)
  if (montoTotal <= 0) return { error: "El total de la nota debe ser mayor a 0" }

  // Validación de NC: no puede superar el saldo del cliente
  if (tipo === "CREDITO") {
    const saldoActual = Number(venta.cuenta.saldo)
    if (montoTotal > saldoActual + 0.005) {
      return {
        error: `El monto de la nota de crédito ($${montoTotal.toLocaleString("es-AR")}) supera el saldo deudor del cliente ($${saldoActual.toLocaleString("es-AR")}).`,
      }
    }
  }

  let notaId: string
  let numero: string
  let duplicada = false

  await prisma.$transaction(async (tx) => {
    // Idempotency
    if (clientRequestId) {
      const existente = await tx.notaCreditoDebito.findUnique({
        where: { clientRequestId },
        select: { id: true, numero: true },
      })
      if (existente) {
        notaId = existente.id
        numero = existente.numero
        duplicada = true
        return
      }
    }

    // Numeración atómica (helper del Bloque A)
    const puntoVenta = await obtenerPuntoVentaDefault(tx)
    const tipoComp = tipo === "CREDITO" ? "NOTA_CREDITO" : "NOTA_DEBITO"
    const { numero: nroAsignado } = await generarNumeroComprobante(tx, {
      tipo:  tipoComp,
      letra,
      puntoVenta,
    })

    // Crear nota + líneas
    const nota = await tx.notaCreditoDebito.create({
      data: {
        tipo,
        letra,
        numero:        nroAsignado,
        puntoVenta,
        ventaOrigenId,
        clienteId:     venta.clienteId,
        motivo,
        montoTotal,
        creadaPorId:   session.user.id,
        clientRequestId: clientRequestId ?? null,
        lineas: {
          create: lineasConBase.map((l) => ({
            productoId:     l.productoId,
            unidadId:       l.unidadId,
            cantidad:       l.cantidad,
            cantidadBase:   l.cantidadBase,
            precioUnitario: l.precioUnitario,
            subtotal:       l.subtotal,
            generaMovimientoStock: l.generaMovimientoStock,
          })),
        },
      },
    })

    notaId = nota.id
    numero = nota.numero

    // Movimiento en cuenta corriente
    // NC → HABER (resta deuda). ND → DEBE (suma deuda).
    const tipoMov = tipo === "CREDITO" ? "HABER" : "DEBE"
    const cuentaActualizada = await tx.cuenta.update({
      where: { id: venta.cuentaId },
      data:  { saldo: tipo === "CREDITO" ? { decrement: montoTotal } : { increment: montoTotal } },
      select: { saldo: true },
    })
    const saldoPosterior = Number(cuentaActualizada.saldo)
    const saldoAnterior  = tipo === "CREDITO" ? saldoPosterior + montoTotal : saldoPosterior - montoTotal

    await tx.movimientoCuenta.create({
      data: {
        cuentaId:      venta.cuentaId,
        tipo:          tipoMov,
        monto:         montoTotal,
        saldoAnterior,
        saldoPosterior,
        descripcion:   `${tipo === "CREDITO" ? "Nota de crédito" : "Nota de débito"} ${nroAsignado} sobre venta #${venta.numero}`,
        usuarioId:     session.user.id,
        origenTipo:    tipo === "CREDITO" ? "nota_credito" : "nota_debito",
        origenId:      nota.id,
      },
    })

    // Movimientos de stock (solo NC con generaMovimientoStock=true)
    if (tipo === "CREDITO") {
      for (const l of lineasConBase) {
        if (!l.generaMovimientoStock) continue
        const updated = await tx.producto.update({
          where: { id: l.productoId },
          data:  { stockTotal: { increment: l.cantidadBase } },
          select: { stockTotal: true },
        })
        const stockPosterior = Number(updated.stockTotal)
        const stockAnterior  = stockPosterior - l.cantidadBase

        await tx.movimientoStock.create({
          data: {
            productoId:    l.productoId,
            tipo:          "DEVOLUCION_CLIENTE",
            cantidad:      l.cantidadBase,
            stockAnterior,
            stockPosterior,
            motivo:        `Nota de crédito ${nroAsignado}`,
            usuarioId:     session.user.id,
            origenTipo:    "nota_credito",
            origenId:      nota.id,
          },
        })
      }
    }
  })

  revalidatePath("/ventas")
  revalidatePath(`/ventas/${ventaOrigenId}`)
  revalidatePath("/cuentas")
  revalidatePath("/stock")

  return { ok: true, notaId: notaId!, numero: numero!, duplicada }
}

// ─────────────────────────────────────────────────────────────────────────────
// Anular nota
// ─────────────────────────────────────────────────────────────────────────────

export async function anularNota(id: string, data: unknown) {
  const session = await requireRole(...ROLES_NOTAS)

  const parsed = esquemaAnularNota.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const nota = await prisma.notaCreditoDebito.findUnique({
    where: { id },
    include: { lineas: true, ventaOrigen: { select: { cuentaId: true, numero: true } } },
  })
  if (!nota) return { error: "Nota no encontrada" }
  if (nota.estado === "ANULADA") return { error: "La nota ya está anulada" }

  await prisma.$transaction(async (tx) => {
    // Marcar anulada
    await tx.notaCreditoDebito.update({
      where: { id },
      data:  {
        estado: "ANULADA",
        anuladaEn: new Date(),
        motivoAnulacion: parsed.data.motivoAnulacion,
      },
    })

    // Revertir movimiento de cuenta (operación opuesta)
    const monto = Number(nota.montoTotal)
    const cuentaActualizada = await tx.cuenta.update({
      where: { id: nota.ventaOrigen.cuentaId },
      data:  { saldo: nota.tipo === "CREDITO" ? { increment: monto } : { decrement: monto } },
      select: { saldo: true },
    })
    const saldoPosterior = Number(cuentaActualizada.saldo)
    const saldoAnterior  = nota.tipo === "CREDITO" ? saldoPosterior - monto : saldoPosterior + monto

    await tx.movimientoCuenta.create({
      data: {
        cuentaId:      nota.ventaOrigen.cuentaId,
        tipo:          nota.tipo === "CREDITO" ? "DEBE" : "HABER",
        monto,
        saldoAnterior,
        saldoPosterior,
        descripcion:   `Anulación nota ${nota.numero} (venta #${nota.ventaOrigen.numero})`,
        usuarioId:     session.user.id,
        origenTipo:    nota.tipo === "CREDITO" ? "nota_credito" : "nota_debito",
        origenId:      nota.id,
      },
    })

    // Revertir stock si la NC había devuelto mercadería
    if (nota.tipo === "CREDITO") {
      for (const l of nota.lineas) {
        if (!l.generaMovimientoStock) continue
        const cantidad = Number(l.cantidadBase)
        const updated = await tx.producto.update({
          where: { id: l.productoId },
          data:  { stockTotal: { decrement: cantidad } },
          select: { stockTotal: true },
        })
        const stockPosterior = Number(updated.stockTotal)
        const stockAnterior  = stockPosterior + cantidad

        await tx.movimientoStock.create({
          data: {
            productoId:    l.productoId,
            tipo:          "EGRESO_VENTA",
            cantidad,
            stockAnterior,
            stockPosterior,
            motivo:        `Anulación nota ${nota.numero}`,
            usuarioId:     session.user.id,
            origenTipo:    "nota_credito",
            origenId:      nota.id,
          },
        })
      }
    }
  })

  revalidatePath("/ventas")
  revalidatePath("/cuentas")
  revalidatePath("/stock")
  return { ok: true }
}
