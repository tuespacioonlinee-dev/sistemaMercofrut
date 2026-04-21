"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { TipoMovimientoStock } from "@prisma/client"

export async function obtenerStockActual() {
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
  const session = await auth()
  if (!session) return { error: "No autorizado" }

  const parsed = ajusteSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." }

  const { productoId, tipo, cantidad, motivo } = parsed.data

  const producto = await prisma.producto.findUnique({ where: { id: productoId } })
  if (!producto) return { error: "Producto no encontrado." }

  const stockAnterior = Number(producto.stockTotal)
  const delta = tipo === "AJUSTE_POSITIVO" ? cantidad : -cantidad
  const stockPosterior = stockAnterior + delta

  if (stockPosterior < 0) return { error: "El stock no puede quedar negativo." }

  await prisma.$transaction([
    prisma.producto.update({
      where: { id: productoId },
      data: { stockTotal: stockPosterior },
    }),
    prisma.movimientoStock.create({
      data: {
        productoId,
        tipo: tipo as TipoMovimientoStock,
        cantidad,
        stockAnterior,
        stockPosterior,
        motivo,
        usuarioId: session.user.id,
      },
    }),
  ])

  revalidatePath("/stock")
  return { ok: true }
}
