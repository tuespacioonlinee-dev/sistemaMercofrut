"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { ventaSchema } from "@/lib/validaciones/ventas"
import { registrarMovimientoCajaEnTx } from "@/server/actions/caja"
import { requireRole, requireSession } from "@/lib/auth-guards"
import { generarNumeroComprobante, obtenerPuntoVentaDefault } from "@/server/lib/numeracion"
import { RolUsuario } from "@prisma/client"

const ROLES_VENTAS = [RolUsuario.ADMIN, RolUsuario.VENDEDOR] as const

// ─────────────────────────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Listado de ventas con paginación cursor.
 *
 * Para la primera página, llamar sin `cursor` y `take` hasta 200.
 * El último elemento devuelto trae `id` que se puede pasar como `cursor` para la siguiente página.
 */
export async function obtenerVentas(opts?: { cursor?: string; take?: number; soloActivas?: boolean }) {
  await requireSession()
  const take = Math.min(opts?.take ?? 200, 500)
  const where = opts?.soloActivas === false ? {} : { estado: { not: "ANULADA" as const } }
  return prisma.venta.findMany({
    where,
    include: {
      cliente: { select: { nombreRazonSocial: true } },
      creadaPor: { select: { nombre: true } },
      remitos: { select: { id: true, numero: true, estado: true } },
    },
    orderBy: { fecha: "desc" },
    take,
    ...(opts?.cursor ? { skip: 1, cursor: { id: opts.cursor } } : {}),
  })
}

export async function obtenerVentaPorId(id: string) {
  await requireSession()
  return prisma.venta.findUnique({
    where: { id },
    include: {
      cliente: true,
      cuenta: true,
      creadaPor: { select: { nombre: true } },
      detalles: {
        include: {
          producto: { select: { nombre: true, codigo: true } },
          unidad: { select: { nombre: true, abreviatura: true } },
        },
      },
      remitos: true,
      facturas: { select: { id: true, numero: true, tipo: true, estado: true } },
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Crear venta + remito + movimiento de caja en una sola transacción
// ─────────────────────────────────────────────────────────────────────────────

export async function crearVenta(data: unknown) {
  const session = await requireRole(...ROLES_VENTAS)

  const parsed = ventaSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { detalles, descuento, clienteId, condicion, observaciones, clientRequestId } = parsed.data

  // Traer productos y factores de conversión
  const productosIds = [...new Set(detalles.map((d) => d.productoId))]
  const unidadesIds  = [...new Set(detalles.map((d) => d.unidadId))]

  const [productosUnidades, productos] = await Promise.all([
    prisma.productoUnidad.findMany({
      where: { productoId: { in: productosIds }, unidadId: { in: unidadesIds } },
    }),
    prisma.producto.findMany({ where: { id: { in: productosIds } } }),
  ])

  // Calcular cantidades en unidad base
  const detallesConBase = detalles.map((d) => {
    const pu = productosUnidades.find(
      (p) => p.productoId === d.productoId && p.unidadId === d.unidadId
    )
    const factor      = pu ? Number(pu.factor) : 1
    const cantidadBase = d.cantidad * factor
    const subtotal     = d.cantidad * d.precioUnitario
    return { ...d, cantidadBase, subtotal }
  })

  // Verificar stock (advertencia, no bloqueo)
  for (const d of detallesConBase) {
    const producto = productos.find((p) => p.id === d.productoId)
    if (!producto) return { error: `Producto no encontrado.` }
  }

  const subtotal = detallesConBase.reduce((acc, d) => acc + d.subtotal, 0)
  const total    = subtotal - descuento

  let ventaId:  string
  let remitoId: string
  let remitoNumero: string
  let ventaYaExistia = false

  await prisma.$transaction(async (tx) => {
    // ── 0. Idempotency: si ya existe una venta con este clientRequestId, devolver la existente ──
    if (clientRequestId) {
      const existente = await tx.venta.findUnique({
        where: { clientRequestId },
        include: { remitos: { take: 1, orderBy: { fecha: "desc" } } },
      })
      if (existente) {
        ventaId = existente.id
        ventaYaExistia = true
        const r = existente.remitos[0]
        if (r) { remitoId = r.id; remitoNumero = r.numero }
        return
      }
    }

    // ── 1. Buscar o crear cuenta del cliente ─────────────────────────────
    let cuenta = await tx.cuenta.findFirst({
      where: {
        clienteId,
        tipo: condicion === "CUENTA_CORRIENTE" ? "CORRIENTE" : "CONTADO",
        deletedAt: null,
      },
    })

    if (!cuenta) {
      const cliente = await tx.cliente.findUnique({ where: { id: clienteId } })
      cuenta = await tx.cuenta.create({
        data: {
          nombre:    `${condicion === "CUENTA_CORRIENTE" ? "Cta. Cte." : "Contado"} - ${cliente?.nombreRazonSocial ?? "Cliente"}`,
          tipo:      condicion === "CUENTA_CORRIENTE" ? "CORRIENTE" : "CONTADO",
          titular:   "CLIENTE",
          clienteId,
        },
      })
    }

    // ── 2. Crear la venta ─────────────────────────────────────────────────
    const venta = await tx.venta.create({
      data: {
        clienteId,
        cuentaId:  cuenta.id,
        condicion,
        subtotal,
        descuento,
        total,
        observaciones:    observaciones ?? null,
        creadaPorId:      session.user.id,
        clientRequestId:  clientRequestId ?? null,
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

    // ── 3. Descontar stock atómicamente (decrement evita lost-update) ─────
    //      Si el producto controla vencimiento, además aplicamos FIFO sobre
    //      los lotes: se va tomando del lote más viejo primero hasta cubrir
    //      la cantidad. Si un lote queda en cero, se marca cerrado.
    for (const d of detallesConBase) {
      const producto = productos.find((p) => p.id === d.productoId)!

      const updated = await tx.producto.update({
        where: { id: d.productoId },
        data:  { stockTotal: { decrement: d.cantidadBase } },
        select: { stockTotal: true },
      })
      const stockPosterior = Number(updated.stockTotal)
      const stockAnterior  = stockPosterior + d.cantidadBase

      // FIFO sobre lotes (solo si controla vencimiento)
      if (producto.controlaVencimiento) {
        const lotes = await tx.loteProducto.findMany({
          where: {
            productoId:     d.productoId,
            activo:         true,
            cantidadActual: { gt: 0 },
          },
          orderBy: [
            // Lotes con vencimiento más cercano primero;
            // los lotes sin fecha de vencimiento van al final.
            { fechaVencimiento: { sort: "asc", nulls: "last" } },
            { fechaIngreso:     "asc" },
          ],
        })

        let restante = d.cantidadBase
        for (const lote of lotes) {
          if (restante <= 0) break
          const disponible = Number(lote.cantidadActual)
          const aTomar = Math.min(disponible, restante)
          await tx.loteProducto.update({
            where: { id: lote.id },
            data: {
              cantidadActual: { decrement: aTomar },
              // Si el lote se vacía, lo cerramos
              ...(aTomar >= disponible ? { activo: false } : {}),
            },
          })
          restante -= aTomar
        }
        // Nota: si restante > 0 al final, el stockTotal del producto y la
        // suma de lotes están desincronizados (probablemente por ajustes
        // manuales previos). El movimiento de stock se asienta igual; el
        // descalce queda visible en los reportes de stock vs lotes.
      }

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

    // ── 4. Movimiento de cuenta corriente (increment atómico) ────────────
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
        descripcion:   `Venta #${venta.numero}`,
        usuarioId:     session.user.id,
        origenTipo:    "venta",
        origenId:      venta.id,
      },
    })

    // ── 5. Crear remito correlativo (helper atómico, ver server/lib/numeracion.ts) ───
    const puntoVenta = await obtenerPuntoVentaDefault(tx)
    const { numero } = await generarNumeroComprobante(tx, {
      tipo:  "REMITO",
      letra: "X",
      puntoVenta,
    })

    const remito = await tx.remito.create({
      data: {
        numero,
        puntoVenta,
        ventaId:    venta.id,
        estado:     "EMITIDO",
      },
    })

    remitoId     = remito.id
    remitoNumero = remito.numero

    // ── 6. Movimiento de caja (si hay caja abierta) ───────────────────────
    if (condicion === "CONTADO") {
      await registrarMovimientoCajaEnTx(tx, {
        tipo:        "CONTADO_HABER",
        categoria:   "VENTA_CONTADO",
        monto:       total,
        descripcion: `Venta #${venta.numero} — Remito ${numero}`,
        usuarioId:   session.user.id,
        origenTipo:  "venta",
        origenId:    venta.id,
      })
    } else {
      // Venta CC: queda asentada en columna DEBE (el cliente nos debe)
      await registrarMovimientoCajaEnTx(tx, {
        tipo:        "CC_DEBE",
        categoria:   "COBRO_CLIENTE",
        monto:       total,
        descripcion: `Venta CC #${venta.numero}`,
        usuarioId:   session.user.id,
        origenTipo:  "venta",
        origenId:    venta.id,
      })
    }
  }, { maxWait: 10_000, timeout: 20_000 })

  revalidatePath("/ventas")
  revalidatePath("/remitos")
  revalidatePath("/stock")
  revalidatePath("/cuentas")
  revalidatePath("/caja")

  return {
    ok: true,
    ventaId: ventaId!,
    remitoId: remitoId!,
    remitoNumero: remitoNumero!,
    duplicada: ventaYaExistia,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Anular venta (y sus remitos)
// ─────────────────────────────────────────────────────────────────────────────

export async function anularVenta(id: string, motivo: string) {
  const session = await requireRole(...ROLES_VENTAS)

  const venta = await prisma.venta.findUnique({
    where:   { id },
    include: { detalles: true, remitos: true },
  })
  if (!venta) return { error: "Venta no encontrada" }
  if (venta.estado === "ANULADA") return { error: "La venta ya está anulada" }

  await prisma.$transaction(async (tx) => {
    // 1. Marcar venta como anulada
    await tx.venta.update({
      where: { id },
      data:  { estado: "ANULADA", anuladaEn: new Date(), motivoAnulacion: motivo },
    })

    // 2. Anular remitos vinculados
    for (const remito of venta.remitos) {
      if (remito.estado === "EMITIDO") {
        await tx.remito.update({
          where: { id: remito.id },
          data:  { estado: "ANULADO", anuladoEn: new Date(), motivoAnulacion: motivo },
        })
      }
    }

    // 3. Devolver stock atómicamente
    for (const detalle of venta.detalles) {
      const cantidad = Number(detalle.cantidadBase)
      const updated = await tx.producto.update({
        where: { id: detalle.productoId },
        data:  { stockTotal: { increment: cantidad } },
        select: { stockTotal: true },
      }).catch(() => null)
      if (!updated) continue

      const stockPosterior = Number(updated.stockTotal)
      const stockAnterior  = stockPosterior - cantidad

      await tx.movimientoStock.create({
        data: {
          productoId:    detalle.productoId,
          tipo:          "DEVOLUCION_CLIENTE",
          cantidad,
          stockAnterior,
          stockPosterior,
          motivo:        `Anulación venta #${venta.numero}`,
          usuarioId:     session.user.id,
          origenTipo:    "venta",
          origenId:      id,
        },
      })
    }

    // 4. Revertir movimiento de cuenta (decrement atómico)
    const totalNum = Number(venta.total)
    const cuentaActualizada = await tx.cuenta.update({
      where: { id: venta.cuentaId },
      data:  { saldo: { decrement: totalNum } },
      select: { saldo: true, id: true },
    }).catch(() => null)

    if (cuentaActualizada) {
      const saldoPosterior = Number(cuentaActualizada.saldo)
      const saldoAnterior  = saldoPosterior + totalNum

      await tx.movimientoCuenta.create({
        data: {
          cuentaId:      cuentaActualizada.id,
          tipo:          "HABER",
          monto:         totalNum,
          saldoAnterior,
          saldoPosterior,
          descripcion:   `Anulación venta #${venta.numero}`,
          usuarioId:     session.user.id,
          origenTipo:    "venta",
          origenId:      id,
        },
      })
    }

    // 5. Contraasiento en caja si era contado
    if (venta.condicion === "CONTADO") {
      await registrarMovimientoCajaEnTx(tx, {
        tipo:        "CONTADO_DEBE",
        categoria:   "VENTA_CONTADO",
        monto:       Number(venta.total),
        descripcion: `Anulación venta #${venta.numero}`,
        usuarioId:   session.user.id,
        origenTipo:  "venta",
        origenId:    id,
      })
    }
  }, { maxWait: 10_000, timeout: 20_000 })

  revalidatePath("/ventas")
  revalidatePath("/remitos")
  revalidatePath("/stock")
  revalidatePath("/cuentas")
  revalidatePath("/caja")
  return { ok: true }
}
