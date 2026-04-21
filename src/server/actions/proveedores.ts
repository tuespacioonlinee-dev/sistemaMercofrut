"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { proveedorSchema } from "@/lib/validaciones/proveedores"

export async function crearProveedor(data: unknown) {
  const parsed = proveedorSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const existe = await prisma.proveedor.findUnique({
    where: { documento: parsed.data.documento },
  })
  if (existe) return { error: "Ya existe un proveedor con ese documento" }

  await prisma.proveedor.create({
    data: {
      ...parsed.data,
      email: parsed.data.email || null,
      direccion: parsed.data.direccion || null,
      localidad: parsed.data.localidad || null,
      telefono: parsed.data.telefono || null,
      observaciones: parsed.data.observaciones || null,
    },
  })
  revalidatePath("/proveedores")
  return { ok: true }
}

export async function editarProveedor(id: string, data: unknown) {
  const parsed = proveedorSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const existe = await prisma.proveedor.findFirst({
    where: { documento: parsed.data.documento, NOT: { id } },
  })
  if (existe) return { error: "Ya existe un proveedor con ese documento" }

  await prisma.proveedor.update({
    where: { id },
    data: {
      ...parsed.data,
      email: parsed.data.email || null,
      direccion: parsed.data.direccion || null,
      localidad: parsed.data.localidad || null,
      telefono: parsed.data.telefono || null,
      observaciones: parsed.data.observaciones || null,
    },
  })
  revalidatePath("/proveedores")
  revalidatePath(`/proveedores/${id}/editar`)
  return { ok: true }
}

export async function toggleProveedorActivo(id: string, activo: boolean) {
  await prisma.proveedor.update({ where: { id }, data: { activo } })
  revalidatePath("/proveedores")
  return { ok: true }
}
