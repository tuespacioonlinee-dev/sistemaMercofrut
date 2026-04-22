"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  esquemaCrearRemito,
  esquemaAnularRemito,
  formatearNumeroRemito,
} from "@/lib/validaciones/remitos"

export async function obtenerRemitos() {
  return prisma.remito.findMany({
    include: {
      venta: {
        select: {
          numero: true,
          total: true,
          condicion: true,
          cliente: { select: { nombreRazonSocial: true } },
          creadaPor: { select: { nombre: true } },
        },
      },
    },
    orderBy: { fecha: "desc" },
    take: 200,
  })
}

export async function obtenerRemitoPorId(id: string) {
  return prisma.remito.findUnique({
    where: { id },
    include: {
      venta: {
        include: {
          cliente: true,
          creadaPor: { select: { nombre: true } },
          detalles: {
            include: {
              producto: { select: { nombre: true, codigo: true } },
              unidad: { select: { nombre: true, abreviatura: true } },
            },
          },
        },
      },
    },
  })
}

/** Ventas CONFIRMADA que pueden tener un nuevo remito */
export async function obtenerVentasParaRemito() {
  return prisma.venta.findMany({
    where: { estado: "CONFIRMADA" },
    include: {
      cliente: { select: { nombreRazonSocial: true } },
      remitos: { select: { id: true, estado: true } },
      detalles: {
        include: {
          producto: { select: { nombre: true } },
          unidad: { select: { abreviatura: true } },
        },
      },
    },
    orderBy: { fecha: "desc" },
    take: 100,
  })
}

export async function crearRemito(data: unknown) {
  const session = await auth()
  if (!session) return { error: "No autorizado" }

  const parsed = esquemaCrearRemito.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { ventaId, observaciones } = parsed.data

  // Verificar que la venta existe y está confirmada
  const venta = await prisma.venta.findUnique({
    where: { id: ventaId },
    select: { id: true, estado: true },
  })
  if (!venta) return { error: "Venta no encontrada" }
  if (venta.estado !== "CONFIRMADA") return { error: "Solo se pueden generar remitos de ventas confirmadas" }

  // Obtener/crear parámetros y numerar en transacción atómica
  const remito = await prisma.$transaction(async (tx) => {
    // Lock optimista: leer y actualizar el correlativo en la misma transacción
    let params = await tx.parametrosComprobante.findFirst()
    if (!params) {
      params = await tx.parametrosComprobante.create({
        data: { puntoVenta: 1, proximoRemito: 1 },
      })
    }

    const numero = formatearNumeroRemito(params.puntoVenta, params.proximoRemito)

    // Incrementar correlativo
    await tx.parametrosComprobante.update({
      where: { id: params.id },
      data: { proximoRemito: { increment: 1 } },
    })

    // Crear el remito
    return tx.remito.create({
      data: {
        numero,
        puntoVenta: params.puntoVenta,
        ventaId,
        estado: "EMITIDO",
        ...(observaciones ? { motivoAnulacion: undefined } : {}),
      },
    })
  })

  revalidatePath("/remitos")
  revalidatePath(`/ventas/${ventaId}`)
  return { ok: true, id: remito.id, numero: remito.numero }
}

export async function anularRemito(remitoId: string, data: unknown) {
  const session = await auth()
  if (!session) return { error: "No autorizado" }

  const parsed = esquemaAnularRemito.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const remito = await prisma.remito.findUnique({
    where: { id: remitoId },
    select: { estado: true, ventaId: true },
  })
  if (!remito) return { error: "Remito no encontrado" }
  if (remito.estado === "ANULADO") return { error: "El remito ya está anulado" }

  await prisma.remito.update({
    where: { id: remitoId },
    data: {
      estado: "ANULADO",
      anuladoEn: new Date(),
      motivoAnulacion: parsed.data.motivoAnulacion,
    },
  })

  revalidatePath("/remitos")
  revalidatePath(`/remitos/${remitoId}`)
  revalidatePath(`/ventas/${remito.ventaId}`)
  return { ok: true }
}
