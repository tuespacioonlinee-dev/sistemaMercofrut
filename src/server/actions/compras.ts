"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { compraSchema } from "@/lib/validaciones/compras"

export async function crearCompra(data: unknown) {
  const session = await auth()
  if (!session) return { error: "No autorizado" }

  const parsed = compraSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { detalles, descuento, iva, ...cabecera } = parsed.data

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

  await prisma.$transaction(async (tx) => {
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

    // 2. Actualizar stock + registrar movimiento + crear lote si corresponde
    for (const d of detallesConBase) {
      const producto = productos.find((p) => p.id === d.productoId)!
      const stockAnterior = Number(producto.stockTotal)
      const stockPosterior = stockAnterior + d.cantidadBase

      await tx.producto.update({
        where: { id: d.productoId },
        data: { stockTotal: stockPosterior },
      })

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

      // Crear lote si el producto controla vencimiento
      if (producto.controlaVencimiento) {
        await tx.loteProducto.create({
          data: {
            productoId: d.productoId,
            numeroLote: d.numeroLote || null,
            cantidadInicial: d.cantidadBase,
            cantidadActual: d.cantidadBase,
            fechaVencimiento: d.fechaVencimiento ? new Date(d.fechaVencimiento) : null,
          },
        })
      }
    }

    // 3. Si es a cuenta corriente, registrar en la cuenta del proveedor
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

      const saldoAnterior = Number(cuenta.saldo)
      const saldoPosterior = saldoAnterior + total

      await tx.cuenta.update({
        where: { id: cuenta.id },
        data: { saldo: saldoPosterior },
      })

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
  })

  revalidatePath("/compras")
  revalidatePath("/stock")
  revalidatePath("/lotes")
  return { ok: true }
}

export async function anularCompra(id: string, motivo: string) {
  const session = await auth()
  if (!session) return { error: "No autorizado" }

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

    // 2. Revertir stock
    for (const detalle of compra.detalles) {
      const producto = await tx.producto.findUnique({ where: { id: detalle.productoId } })
      if (!producto) continue

      const stockAnterior = Number(producto.stockTotal)
      const stockPosterior = stockAnterior - Number(detalle.cantidadBase)

      await tx.producto.update({
        where: { id: detalle.productoId },
        data: { stockTotal: stockPosterior },
      })

      await tx.movimientoStock.create({
        data: {
          productoId: detalle.productoId,
          tipo: "DEVOLUCION_PROVEEDOR",
          cantidad: Number(detalle.cantidadBase),
          stockAnterior,
          stockPosterior,
          motivo: `Anulación compra ${id}`,
          usuarioId: session.user.id,
          origenTipo: "compra",
          origenId: id,
        },
      })

      // Desactivar lotes creados por esta compra
      await tx.loteProducto.updateMany({
        where: { productoId: detalle.productoId, activo: true },
        data: { activo: false },
      })
    }

    // 3. Si era CC, revertir movimiento de cuenta
    if (compra.condicion === "CUENTA_CORRIENTE") {
      const cuenta = await tx.cuenta.findFirst({
        where: { proveedorId: compra.proveedorId, tipo: "CORRIENTE" },
      })
      if (cuenta) {
        const saldoAnterior = Number(cuenta.saldo)
        const saldoPosterior = saldoAnterior - Number(compra.total)
        await tx.cuenta.update({
          where: { id: cuenta.id },
          data: { saldo: saldoPosterior },
        })
        await tx.movimientoCuenta.create({
          data: {
            cuentaId: cuenta.id,
            tipo: "HABER",
            monto: Number(compra.total),
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
  })

  revalidatePath("/compras")
  revalidatePath("/productos")
  return { ok: true }
}
