"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { compraSchema } from "@/lib/validaciones/compras"
import { registrarMovimientoCajaEnTx } from "@/server/actions/caja"
import { requireRole } from "@/lib/auth-guards"
import { RolUsuario } from "@prisma/client"

const ROLES_COMPRAS = [RolUsuario.ADMIN, RolUsuario.COMPRADOR] as const

export async function crearCompra(data: unknown) {
  const session = await requireRole(...ROLES_COMPRAS)

  const parsed = compraSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { detalles, descuento, iva, clientRequestId, ...cabecera } = parsed.data

  // Resolver factores de conversión y calcular totales
  const unidadesIds = [...new Set(detalles.map((d) => d.unidadId))]
  const productosIds = [...new Set(detalles.map((d) => d.productoId))]

  const [productosUnidades, productos] = await Promise.all([
    prisma.productoUnidad.findMany({
      where: {
        productoId: { in: productosIds },
        unidadId: { in: unidadesIds },
      },
    }),
    prisma.producto.findMany({ where: { id: { in: productosIds } } }),
  ])

  // Calcular cantidadBase para cada detalle (si no tiene factor, 1:1)
  const detallesConBase = detalles.map((d) => {
    const productoUnidad = productosUnidades.find(
      (pu) => pu.productoId === d.productoId && pu.unidadId === d.unidadId
    )
    const factor = productoUnidad ? Number(productoUnidad.factor) : 1
    const cantidadBase = d.cantidad * factor
    const subtotal = d.cantidad * d.precioUnitario
    return { ...d, cantidadBase, subtotal }
  })

  const subtotal = detallesConBase.reduce((acc, d) => acc + d.subtotal, 0)
  const total = subtotal + (iva ?? 0) - descuento

  let compraYaExistia = false
  let compraId: string | null = null

  await prisma.$transaction(async (tx) => {
    // ── 0. Idempotency check ──────────────────────────────────────────────
    if (clientRequestId) {
      const existente = await tx.compra.findUnique({
        where: { clientRequestId },
        select: { id: true },
      })
      if (existente) { compraYaExistia = true; compraId = existente.id; return }
    }

    // 1. Crear la compra con sus detalles
    const compra = await tx.compra.create({
      data: {
        ...cabecera,
        numeroComprobante: cabecera.numeroComprobante || null,
        observaciones: cabecera.observaciones || null,
        descuento,
        iva: iva ?? 0,
        subtotal,
        total,
        creadaPorId: session.user.id,
        clientRequestId: clientRequestId ?? null,
        detalles: {
          create: detallesConBase.map((d) => ({
            productoId: d.productoId,
            unidadId: d.unidadId,
            cantidad: d.cantidad,
            cantidadBase: d.cantidadBase,
            precioUnitario: d.precioUnitario,
            subtotal: d.subtotal,
          })),
        },
      },
    })
    compraId = compra.id

    // 2. Actualizar stock atómicamente + registrar movimiento + crear lote
    for (const d of detallesConBase) {
      const producto = productos.find((p) => p.id === d.productoId)!

      const updated = await tx.producto.update({
        where: { id: d.productoId },
        data:  { stockTotal: { increment: d.cantidadBase } },
        select: { stockTotal: true },
      })
      const stockPosterior = Number(updated.stockTotal)
      const stockAnterior  = stockPosterior - d.cantidadBase

      await tx.movimientoStock.create({
        data: {
          productoId: d.productoId,
          tipo: "INGRESO_COMPRA",
          cantidad: d.cantidadBase,
          stockAnterior,
          stockPosterior,
          usuarioId: session.user.id,
          origenTipo: "compra",
          origenId: compra.id,
        },
      })

      // Crear lote si el producto controla vencimiento — vinculado a esta compra
      if (producto.controlaVencimiento) {
        await tx.loteProducto.create({
          data: {
            productoId: d.productoId,
            numeroLote: d.numeroLote || null,
            cantidadInicial: d.cantidadBase,
            cantidadActual: d.cantidadBase,
            fechaVencimiento: d.fechaVencimiento ? new Date(d.fechaVencimiento) : null,
            origenCompraId: compra.id,
          },
        })
      }
    }

    // 3. Registrar en caja diaria
    const proveedor = await tx.proveedor.findUnique({
      where: { id: cabecera.proveedorId },
      select: { nombreRazonSocial: true },
    })
    const nombreProv = proveedor?.nombreRazonSocial ?? "Proveedor"
    const concepto = cabecera.numeroComprobante
      ? `Compra ${nombreProv} — ${cabecera.numeroComprobante}`
      : `Compra ${nombreProv}`

    if (cabecera.condicion === "CONTADO") {
      await registrarMovimientoCajaEnTx(tx, {
        tipo: "CONTADO_DEBE",
        categoria: "COMPRA_CONTADO",
        monto: total,
        descripcion: concepto,
        usuarioId: session.user.id,
        origenTipo: "compra",
        origenId: compra.id,
      })
    } else {
      await registrarMovimientoCajaEnTx(tx, {
        tipo: "CC_DEBE",
        categoria: "PAGO_PROVEEDOR",
        monto: total,
        descripcion: concepto,
        usuarioId: session.user.id,
        origenTipo: "compra",
        origenId: compra.id,
      })
    }

    // 4. Si es a cuenta corriente, registrar en la cuenta del proveedor
    if (cabecera.condicion === "CUENTA_CORRIENTE") {
      let cuenta = await tx.cuenta.findFirst({
        where: { proveedorId: cabecera.proveedorId, tipo: "CORRIENTE" },
      })

      if (!cuenta) {
        const proveedor = await tx.proveedor.findUnique({
          where: { id: cabecera.proveedorId },
        })
        cuenta = await tx.cuenta.create({
          data: {
            nombre: `CC ${proveedor?.nombreRazonSocial ?? "Proveedor"}`,
            tipo: "CORRIENTE",
            titular: "PROVEEDOR",
            proveedorId: cabecera.proveedorId,
          },
        })
      }

      const cuentaActualizada = await tx.cuenta.update({
        where: { id: cuenta.id },
        data:  { saldo: { increment: total } },
        select: { saldo: true },
      })
      const saldoPosterior = Number(cuentaActualizada.saldo)
      const saldoAnterior  = saldoPosterior - total

      await tx.movimientoCuenta.create({
        data: {
          cuentaId: cuenta.id,
          tipo: "DEBE",
          monto: total,
          saldoAnterior,
          saldoPosterior,
          descripcion: `Compra ${compra.id}`,
          usuarioId: session.user.id,
          origenTipo: "compra",
          origenId: compra.id,
        },
      })
    }
  }, { maxWait: 10_000, timeout: 20_000 })

  revalidatePath("/compras")
  revalidatePath("/stock")
  revalidatePath("/lotes")
  return { ok: true, compraId, duplicada: compraYaExistia }
}

export async function anularCompra(id: string, motivo: string) {
  const session = await requireRole(...ROLES_COMPRAS)

  const compra = await prisma.compra.findUnique({
    where: { id },
    include: { detalles: true },
  })
  if (!compra) return { error: "Compra no encontrada" }
  if (compra.estado === "ANULADA") return { error: "La compra ya está anulada" }

  await prisma.$transaction(async (tx) => {
    // 1. Marcar como anulada
    await tx.compra.update({
      where: { id },
      data: { estado: "ANULADA", anuladaEn: new Date(), motivoAnulacion: motivo },
    })

    // 2. Revertir stock atómicamente
    for (const detalle of compra.detalles) {
      const cantidad = Number(detalle.cantidadBase)
      const updated = await tx.producto.update({
        where: { id: detalle.productoId },
        data:  { stockTotal: { decrement: cantidad } },
        select: { stockTotal: true },
      }).catch(() => null)
      if (!updated) continue

      const stockPosterior = Number(updated.stockTotal)
      const stockAnterior  = stockPosterior + cantidad

      await tx.movimientoStock.create({
        data: {
          productoId: detalle.productoId,
          tipo: "DEVOLUCION_PROVEEDOR",
          cantidad,
          stockAnterior,
          stockPosterior,
          motivo: `Anulación compra ${id}`,
          usuarioId: session.user.id,
          origenTipo: "compra",
          origenId: id,
        },
      })
    }

    // 2b. Desactivar SOLO los lotes creados por esta compra
    await tx.loteProducto.updateMany({
      where: { origenCompraId: id, activo: true },
      data: { activo: false },
    })

    // 3. Si era CC, revertir movimiento de cuenta (decrement atómico)
    if (compra.condicion === "CUENTA_CORRIENTE") {
      const cuenta = await tx.cuenta.findFirst({
        where: { proveedorId: compra.proveedorId, tipo: "CORRIENTE" },
      })
      if (cuenta) {
        const totalNum = Number(compra.total)
        const cuentaActualizada = await tx.cuenta.update({
          where: { id: cuenta.id },
          data:  { saldo: { decrement: totalNum } },
          select: { saldo: true },
        })
        const saldoPosterior = Number(cuentaActualizada.saldo)
        const saldoAnterior  = saldoPosterior + totalNum

        await tx.movimientoCuenta.create({
          data: {
            cuentaId: cuenta.id,
            tipo: "HABER",
            monto: totalNum,
            saldoAnterior,
            saldoPosterior,
            descripcion: `Anulación compra ${id}`,
            usuarioId: session.user.id,
            origenTipo: "compra",
            origenId: id,
          },
        })
      }
    }
  }, { maxWait: 10_000, timeout: 20_000 })

  revalidatePath("/compras")
  revalidatePath("/productos")
  return { ok: true }
}
