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

export async function obtenerFacturas(opts?: { cursor?: string; take?: number }) {
  const take = Math.min(opts?.take ?? 300, 500)
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
    take,
    ...(opts?.cursor ? { skip: 1, cursor: { id: opts.cursor } } : {}),
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
    take: 300,
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

  // Re-chequeo + numeración atómica. UPDATE increment serializa los writers concurrentes;
  // el unique parcial sobre (ventaId, estado=EMITIDA) garantiza que dos clicks rápidos
  // en la misma venta no generen duplicado.
  let facturaYaExistia = false
  const factura = await prisma.$transaction(async (tx) => {
    // Re-check dentro de la tx: si apareció una factura emitida entre el check inicial y acá, abortar
    const yaFacturada = await tx.factura.findFirst({
      where: { ventaId, estado: "EMITIDA" },
      select: { id: true, numero: true, tipo: true },
    })
    if (yaFacturada) { facturaYaExistia = true; return yaFacturada }

    let comp = await tx.parametrosComprobante.findFirst()
    if (!comp) {
      comp = await tx.parametrosComprobante.create({ data: { puntoVenta: 1 } })
    }

    const correlativoKey: "proximaFacturaA" | "proximaFacturaB" | "proximaFacturaC" =
      tipo === "A" ? "proximaFacturaA" : tipo === "B" ? "proximaFacturaB" : "proximaFacturaC"

    // Update atómico ANTES de derivar el número
    const actualizado = await tx.parametrosComprobante.update({
      where: { id: comp.id },
      data:  { [correlativoKey]: { increment: 1 } },
    })
    const numeroAsignado = actualizado[correlativoKey] - 1
    const numero = formatearNumeroFactura(actualizado.puntoVenta, numeroAsignado)

    return tx.factura.create({
      data: {
        numero,
        puntoVenta: actualizado.puntoVenta as number,
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

  if (facturaYaExistia) {
    return { error: "Esta venta ya tiene una factura vigente" }
  }

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
