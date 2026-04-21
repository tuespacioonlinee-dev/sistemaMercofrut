"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ventaSchema } from "@/lib/validaciones/ventas"

export async function obtenerVentas() {
  return prisma.venta.findMany({
    where: { estado: { not: "ANULADA" } },
    include: {
      cliente: { select: { nombreRazonSocial: true } },
      creadaPor: { select: { nombre: true } },
    },
    orderBy: { fecha: "desc" },
    take: 100,
  })
}

export async function obtenerVentaPorId(id: string) {
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
    },
  })
}

export async function crearVenta(data: unknown) {
  const session = await auth()
  if (!session) return { error: "No autorizado" }

  const parsed = ventaSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { detalles, descuento, clienteId, condicion, observaciones } = parsed.data

  // Traer productos y factores de conversión
  const productosIds = [...new Set(detalles.map((d) => d.productoId))]
  const unidadesIds = [...new Set(detalles.map((d) => d.unidadId))]

  const [productosUnidades, productos] = await Promise.all([
    prisma.productoUnidad.findMany({
      where: { productoId: { in: productosIds }, unidadId: { in: unidadesIds } },
    }),
    prisma.producto.findMany({ where: { id: { in: productosIds } } }),
  ])

  // Verificar stock suficiente antes de operar
  const detallesConBase = detalles.map((d) => {
    const pu = productosUnidades.find(
      (p) => p.productoId === d.productoId && p.unidadId === d.unidadId
    )
    const factor = pu ? Number(pu.factor) : 1
    const cantidadBase = d.cantidad * factor
    const subtotal = d.cantidad * d.precioUnitario
    return { ...d, cantidadBase, subtotal }
  })

  for (const d of detallesConBase) {
    const producto = productos.find((p) => p.id === d.productoId)
    if (!producto) return { error: `Producto no encontrado.` }
    if (Number(producto.stockTotal) < d.cantidadBase) {
      return { error: `Stock insuficiente para "${producto.nombre}". Stock actual: ${Number(producto.stockTotal).toFixed(3)}` }
    }
  }

  const subtotal = detallesConBase.reduce((acc, d) => acc + d.subtotal, 0)
  const total = subtotal - descuento

  let ventaId: string

  await prisma.$transaction(async (tx) => {
    // 1. Buscar o crear cuenta del cliente según condición
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
          nombre: `${condicion === "CUENTA_CORRIENTE" ? "Cta. Cte." : "Contado"} - ${cliente?.nombreRazonSocial ?? "Cliente"}`,
          tipo: condicion === "CUENTA_CORRIENTE" ? "CORRIENTE" : "CONTADO",
          titular: "CLIENTE",
          clienteId,
        },
      })
    }

    // 2. Crear la venta con sus detalles
    const venta = await tx.venta.create({
      data: {
        clienteId,
        cuentaId: cuenta.id,
        condicion,
        subtotal,
        descuento,
        total,
        observaciones: observaciones || null,
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

    ventaId = venta.id

    // 3. Descontar stock + registrar movimientos
    for (const d of detallesConBase) {
      const producto = productos.find((p) => p.id === d.productoId)!
      const stockAnterior = Number(producto.stockTotal)
      const stockPosterior = stockAnterior - d.cantidadBase

      await tx.producto.update({
        where: { id: d.productoId },
        data: { stockTotal: stockPosterior },
      })

      await tx.movimientoStock.create({
        data: {
          productoId: d.productoId,
          tipo: "EGRESO_VENTA",
          cantidad: d.cantidadBase,
          stockAnterior,
          stockPosterior,
          usuarioId: session.user.id,
          origenTipo: "venta",
          origenId: venta.id,
        },
      })
    }

    // 4. Registrar movimiento en cuenta corriente
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
        descripcion: `Venta #${venta.numero}`,
        usuarioId: session.user.id,
        origenTipo: "venta",
        origenId: venta.id,
      },
    })
  })

  revalidatePath("/ventas")
  revalidatePath("/stock")
  revalidatePath("/cuentas")
  return { ok: true, id: ventaId! }
}

export async function anularVenta(id: string, motivo: string) {
  const session = await auth()
  if (!session) return { error: "No autorizado" }

  const venta = await prisma.venta.findUnique({
    where: { id },
    include: { detalles: true },
  })
  if (!venta) return { error: "Venta no encontrada" }
  if (venta.estado === "ANULADA") return { error: "La venta ya está anulada" }

  await prisma.$transaction(async (tx) => {
    // 1. Marcar como anulada
    await tx.venta.update({
      where: { id },
      data: { estado: "ANULADA", anuladaEn: new Date(), motivoAnulacion: motivo },
    })

    // 2. Devolver stock
    for (const detalle of venta.detalles) {
      const producto = await tx.producto.findUnique({ where: { id: detalle.productoId } })
      if (!producto) continue

      const stockAnterior = Number(producto.stockTotal)
      const stockPosterior = stockAnterior + Number(detalle.cantidadBase)

      await tx.producto.update({
        where: { id: detalle.productoId },
        data: { stockTotal: stockPosterior },
      })

      await tx.movimientoStock.create({
        data: {
          productoId: detalle.productoId,
          tipo: "DEVOLUCION_CLIENTE",
          cantidad: Number(detalle.cantidadBase),
          stockAnterior,
          stockPosterior,
          motivo: `Anulación venta #${venta.numero}`,
          usuarioId: session.user.id,
          origenTipo: "venta",
          origenId: id,
        },
      })
    }

    // 3. Revertir movimiento de cuenta
    const cuenta = await tx.cuenta.findUnique({ where: { id: venta.cuentaId } })
    if (cuenta) {
      const saldoAnterior = Number(cuenta.saldo)
      const saldoPosterior = saldoAnterior - Number(venta.total)

      await tx.cuenta.update({
        where: { id: cuenta.id },
        data: { saldo: saldoPosterior },
      })

      await tx.movimientoCuenta.create({
        data: {
          cuentaId: cuenta.id,
          tipo: "HABER",
          monto: Number(venta.total),
          saldoAnterior,
          saldoPosterior,
          descripcion: `Anulación venta #${venta.numero}`,
          usuarioId: session.user.id,
          origenTipo: "venta",
          origenId: id,
        },
      })
    }
  })

  revalidatePath("/ventas")
  revalidatePath("/stock")
  revalidatePath("/cuentas")
  return { ok: true }
}
