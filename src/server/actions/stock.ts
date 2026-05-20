"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { RolUsuario, TipoMovimientoStock } from "@prisma/client"
import { requireRole, requireSession } from "@/lib/auth-guards"

export async function obtenerStockActual() {
  await requireSession()
  return prisma.producto.findMany({
    where: { activo: true, deletedAt: null },
    select: {
      id: true,
      codigo: true,
      nombre: true,
      stockTotal: true,
      stockMinimo: true,
      controlaVencimiento: true,
      categoria: { select: { nombre: true } },
      unidadBase: { select: { abreviatura: true } },
      lotes: {
        where: { activo: true, cantidadActual: { gt: 0 } },
        select: { id: true, fechaVencimiento: true, cantidadActual: true, numeroLote: true },
        orderBy: { fechaVencimiento: "asc" },
      },
    },
    orderBy: { nombre: "asc" },
  })
}

export async function obtenerMovimientosProducto(productoId: string) {
  await requireSession()
  return prisma.movimientoStock.findMany({
    where: { productoId },
    select: {
      id: true,
      tipo: true,
      cantidad: true,
      stockAnterior: true,
      stockPosterior: true,
      motivo: true,
      fecha: true,
      usuario: { select: { nombre: true } },
    },
    orderBy: { fecha: "desc" },
    take: 100,
  })
}

const ajusteSchema = z.object({
  productoId: z.string().min(1),
  tipo: z.enum(["AJUSTE_POSITIVO", "AJUSTE_NEGATIVO"]),
  cantidad: z.number().positive("La cantidad debe ser mayor a 0"),
  motivo: z.string().min(3, "Ingresá un motivo").max(200).trim(),
})

export async function ajustarStock(data: unknown) {
  const session = await requireRole(RolUsuario.ADMIN, RolUsuario.COMPRADOR)

  const parsed = ajusteSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." }

  const { productoId, tipo, cantidad, motivo } = parsed.data

  const producto = await prisma.producto.findUnique({ where: { id: productoId } })
  if (!producto) return { error: "Producto no encontrado." }

  // Pre-check (no bloquea la concurrencia, pero da error claro al usuario común)
  if (tipo === "AJUSTE_NEGATIVO" && Number(producto.stockTotal) - cantidad < 0) {
    return { error: "El stock no puede quedar negativo." }
  }

  // Update atómico — el stockPosterior se obtiene del valor real post-update
  await prisma.$transaction(async (tx) => {
    const updated = await tx.producto.update({
      where: { id: productoId },
      data:  tipo === "AJUSTE_POSITIVO"
        ? { stockTotal: { increment: cantidad } }
        : { stockTotal: { decrement: cantidad } },
      select: { stockTotal: true, controlaVencimiento: true },
    })
    const stockPosterior = Number(updated.stockTotal)
    const stockAnterior  = tipo === "AJUSTE_POSITIVO"
      ? stockPosterior - cantidad
      : stockPosterior + cantidad

    // Defensa final ante race: si quedó negativo, abortar (rollback)
    if (stockPosterior < 0) {
      throw new Error("STOCK_NEGATIVO")
    }

    // Si es ajuste negativo sobre un producto que controla vencimiento,
    // aplicar FIFO sobre los lotes (mismo criterio que la venta).
    if (tipo === "AJUSTE_NEGATIVO" && updated.controlaVencimiento) {
      const lotes = await tx.loteProducto.findMany({
        where: {
          productoId,
          activo:         true,
          cantidadActual: { gt: 0 },
        },
        orderBy: [
          { fechaVencimiento: { sort: "asc", nulls: "last" } },
          { fechaIngreso:     "asc" },
        ],
      })
      let restante = cantidad
      for (const lote of lotes) {
        if (restante <= 0) break
        const disponible = Number(lote.cantidadActual)
        const aTomar = Math.min(disponible, restante)
        await tx.loteProducto.update({
          where: { id: lote.id },
          data: {
            cantidadActual: { decrement: aTomar },
            ...(aTomar >= disponible ? { activo: false } : {}),
          },
        })
        restante -= aTomar
      }
    }

    await tx.movimientoStock.create({
      data: {
        productoId,
        tipo: tipo as TipoMovimientoStock,
        cantidad,
        stockAnterior,
        stockPosterior,
        motivo,
        usuarioId: session.user.id,
      },
    })
  }).catch((e) => {
    if (e instanceof Error && e.message === "STOCK_NEGATIVO") {
      throw new Error("El stock no puede quedar negativo.")
    }
    throw e
  })

  revalidatePath("/stock")
  return { ok: true }
}
