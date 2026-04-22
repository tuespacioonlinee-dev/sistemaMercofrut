"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  esquemaCrearFactura,
  esquemaAnularFactura,
  formatearNumeroFactura,
  determinarTipoFactura,
  calcularIva,
} from "@/lib/validaciones/facturacion"

export async function obtenerFacturas() {
  return prisma.factura.findMany({
    include: {
      venta: {
        select: {
          numero: true,
          total: true,
          condicion: true,
          cliente: { select: { nombreRazonSocial: true, condicionIva: true } },
        },
      },
      remito: { select: { numero: true } },
    },
    orderBy: { fechaEmision: "desc" },
    take: 200,
  })
}

export async function obtenerFacturaPorId(id: string) {
  return prisma.factura.findUnique({
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
      remito: { select: { numero: true } },
    },
  })
}

/** Ventas CONFIRMADA sin factura emitida vigente */
export async function obtenerVentasParaFacturar() {
  const ventas = await prisma.venta.findMany({
    where: { estado: "CONFIRMADA" },
    include: {
      cliente: { select: { nombreRazonSocial: true, condicionIva: true } },
      facturas: { select: { id: true, estado: true, tipo: true } },
      remitos: { select: { id: true, numero: true, estado: true } },
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

  return ventas
}

export async function crearFactura(data: unknown) {
  const session = await auth()
  if (!session) return { error: "No autorizado" }

  const parsed = esquemaCrearFactura.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { ventaId, remitoId } = parsed.data

  // Verificar venta
  const venta = await prisma.venta.findUnique({
    where: { id: ventaId },
    include: {
      cliente: { select: { condicionIva: true } },
      facturas: { where: { estado: "EMITIDA" }, select: { id: true } },
    },
  })
  if (!venta) return { error: "Venta no encontrada" }
  if (venta.estado !== "CONFIRMADA") return { error: "Solo se facturan ventas confirmadas" }
  if (venta.facturas.length > 0) return { error: "Esta venta ya tiene una factura vigente" }

  // Parámetros del negocio para determinar tipo
  const params = await prisma.parametrosNegocio.findFirst()
  if (!params) return { error: "Configurá los parámetros del negocio antes de facturar" }

  const tipo = determinarTipoFactura(params.condicionIva, venta.cliente.condicionIva)
  const subtotal = Number(venta.subtotal) - Number(venta.descuento)
  const iva = calcularIva(subtotal, tipo)
  const total = subtotal + iva

  const factura = await prisma.$transaction(async (tx) => {
    let comp = await tx.parametrosComprobante.findFirst()
    if (!comp) {
      comp = await tx.parametrosComprobante.create({ data: { puntoVenta: 1 } })
    }

    // Elegir correlativo según tipo
    const correlativoKey =
      tipo === "A" ? "proximaFacturaA" : tipo === "B" ? "proximaFacturaB" : "proximaFacturaC"
    const numeroCorrelativo = comp[correlativoKey]
    const numero = formatearNumeroFactura(comp.puntoVenta, numeroCorrelativo)

    await tx.parametrosComprobante.update({
      where: { id: comp.id },
      data: { [correlativoKey]: { increment: 1 } },
    })

    return tx.factura.create({
      data: {
        numero,
        puntoVenta: comp.puntoVenta,
        tipo,
        ventaId,
        remitoId: remitoId ?? null,
        subtotal,
        iva,
        total,
        estado: "EMITIDA",
      },
    })
  })

  revalidatePath("/facturacion")
  revalidatePath(`/ventas/${ventaId}`)
  return { ok: true, id: factura.id, numero: factura.numero, tipo: factura.tipo }
}

export async function anularFactura(facturaId: string, data: unknown) {
  const session = await auth()
  if (!session) return { error: "No autorizado" }

  const parsed = esquemaAnularFactura.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const factura = await prisma.factura.findUnique({
    where: { id: facturaId },
    select: { estado: true, ventaId: true },
  })
  if (!factura) return { error: "Factura no encontrada" }
  if (factura.estado === "ANULADA") return { error: "La factura ya está anulada" }

  await prisma.factura.update({
    where: { id: facturaId },
    data: {
      estado: "ANULADA",
      // Guardamos el motivo en arcaRespuesta como metadata hasta tener campo propio
      arcaRespuesta: { motivoAnulacion: parsed.data.motivoAnulacion, anuladaEn: new Date().toISOString() },
    },
  })

  revalidatePath("/facturacion")
  revalidatePath(`/facturacion/${facturaId}`)
  revalidatePath(`/ventas/${factura.ventaId}`)
  return { ok: true }
}
