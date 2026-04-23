"use server"

import { prisma } from "@/lib/prisma"
import { esquemaParametros } from "@/lib/validaciones/parametros"
import { revalidatePath } from "next/cache"
import { z } from "zod"

export async function obtenerParametros() {
  return prisma.parametrosNegocio.findFirst()
}

export async function guardarParametros(formData: unknown) {
  const resultado = esquemaParametros.safeParse(formData)

  if (!resultado.success) {
    return { error: "Datos inválidos. Revisá los campos marcados." }
  }

  const data = resultado.data

  const existente = await prisma.parametrosNegocio.findFirst()

  const datosGuardar = {
    nombreFantasia: data.nombreFantasia,
    razonSocial: data.razonSocial,
    cuit: data.cuit,
    condicionIva: data.condicionIva,
    direccion: data.direccion,
    localidad: data.localidad,
    telefono: data.telefono || null,
    email: data.email || null,
    ingresosBrutos: data.ingresosBrutos || null,
    inicioActividades: data.inicioActividades ? new Date(data.inicioActividades) : null,
  }

  if (existente) {
    await prisma.parametrosNegocio.update({
      where: { id: existente.id },
      data: datosGuardar,
    })
  } else {
    await prisma.parametrosNegocio.create({ data: datosGuardar })
  }

  revalidatePath("/parametros")
  return { ok: true }
}

// ─────────────────────────────────────────────────────────────────────────────
// Numeración de comprobantes (remitos y facturas)
// ─────────────────────────────────────────────────────────────────────────────

export async function obtenerComprobantes() {
  const comp = await prisma.parametrosComprobante.findFirst()
  if (!comp) return null
  return {
    id:              comp.id,
    puntoVenta:      comp.puntoVenta,
    proximoRemito:   comp.proximoRemito,
    proximaFacturaA: comp.proximaFacturaA,
    proximaFacturaB: comp.proximaFacturaB,
    proximaFacturaC: comp.proximaFacturaC,
  }
}

const esquemaNumeracion = z.object({
  puntoVenta:      z.number().int().min(1, "Debe ser al menos 1"),
  proximoRemito:   z.number().int().min(1, "Debe ser al menos 1"),
  proximaFacturaA: z.number().int().min(1, "Debe ser al menos 1"),
  proximaFacturaB: z.number().int().min(1, "Debe ser al menos 1"),
  proximaFacturaC: z.number().int().min(1, "Debe ser al menos 1"),
})

export type DatosNumeracion = z.infer<typeof esquemaNumeracion>

export async function actualizarNumeracion(data: unknown) {
  const parsed = esquemaNumeracion.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const comp = await prisma.parametrosComprobante.findFirst()

  if (comp) {
    await prisma.parametrosComprobante.update({
      where: { id: comp.id },
      data:  parsed.data,
    })
  } else {
    await prisma.parametrosComprobante.create({ data: parsed.data })
  }

  revalidatePath("/parametros")
  revalidatePath("/remitos")
  return { ok: true }
}
