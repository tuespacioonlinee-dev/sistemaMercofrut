"use server"

import { prisma } from "@/lib/prisma"
import { esquemaCliente } from "@/lib/validaciones/clientes"
import { revalidatePath } from "next/cache"

export async function obtenerClientes() {
  return prisma.cliente.findMany({
    where: { deletedAt: null },
    orderBy: { nombreRazonSocial: "asc" },
  })
}

export async function obtenerClientePorId(id: string) {
  return prisma.cliente.findFirst({
    where: { id, deletedAt: null },
  })
}

export async function crearCliente(formData: unknown) {
  const resultado = esquemaCliente.safeParse(formData)

  if (!resultado.success) {
    return { error: "Datos inválidos. Revisá los campos marcados." }
  }

  const data = resultado.data

  const existe = await prisma.cliente.findFirst({
    where: { documento: data.documento, deletedAt: null },
  })

  if (existe) {
    return { error: "Ya existe un cliente con ese número de documento." }
  }

  const cliente = await prisma.cliente.create({
    data: {
      nombreRazonSocial: data.nombreRazonSocial,
      tipoDocumento: data.tipoDocumento,
      documento: data.documento,
      condicionIva: data.condicionIva,
      direccion: data.direccion || null,
      localidad: data.localidad || null,
      telefono: data.telefono || null,
      email: data.email || null,
      observaciones: data.observaciones || null,
    },
  })

  revalidatePath("/clientes")
  return { ok: true, id: cliente.id }
}

export async function editarCliente(id: string, formData: unknown) {
  const resultado = esquemaCliente.safeParse(formData)

  if (!resultado.success) {
    return { error: "Datos inválidos. Revisá los campos marcados." }
  }

  const data = resultado.data

  const existe = await prisma.cliente.findFirst({
    where: { documento: data.documento, deletedAt: null, NOT: { id } },
  })

  if (existe) {
    return { error: "Ya existe otro cliente con ese número de documento." }
  }

  await prisma.cliente.update({
    where: { id },
    data: {
      nombreRazonSocial: data.nombreRazonSocial,
      tipoDocumento: data.tipoDocumento,
      documento: data.documento,
      condicionIva: data.condicionIva,
      direccion: data.direccion || null,
      localidad: data.localidad || null,
      telefono: data.telefono || null,
      email: data.email || null,
      observaciones: data.observaciones || null,
    },
  })

  revalidatePath("/clientes")
  revalidatePath(`/clientes/${id}/editar`)
  return { ok: true }
}

export async function eliminarCliente(id: string) {
  await prisma.cliente.update({
    where: { id },
    data: { deletedAt: new Date(), activo: false },
  })

  revalidatePath("/clientes")
  return { ok: true }
}
