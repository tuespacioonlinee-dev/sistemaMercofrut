"use server"

import { prisma } from "@/lib/prisma"
import { esquemaParametros } from "@/lib/validaciones/parametros"
import { revalidatePath } from "next/cache"

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
