"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { productoSchema } from "@/lib/validaciones/productos"

export async function crearProducto(data: unknown) {
  const parsed = productoSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const existe = await prisma.producto.findUnique({
    where: { codigo: parsed.data.codigo },
  })
  if (existe) return { error: "Ya existe un producto con ese código" }

  await prisma.producto.create({
    data: {
      codigo: parsed.data.codigo,
      nombre: parsed.data.nombre,
      categoriaId: parsed.data.categoriaId,
      unidadBaseId: parsed.data.unidadBaseId,
      precioVenta: parsed.data.precioVenta,
      precioCompra: parsed.data.precioCompra,
      stockMinimo: parsed.data.stockMinimo,
      controlaVencimiento: parsed.data.controlaVencimiento,
    },
  })

  revalidatePath("/productos")
  return { ok: true }
}

export async function editarProducto(id: string, data: unknown) {
  const parsed = productoSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const existe = await prisma.producto.findFirst({
    where: { codigo: parsed.data.codigo, NOT: { id } },
  })
  if (existe) return { error: "Ya existe un producto con ese código" }

  await prisma.producto.update({
    where: { id },
    data: {
      codigo: parsed.data.codigo,
      nombre: parsed.data.nombre,
      categoriaId: parsed.data.categoriaId,
      unidadBaseId: parsed.data.unidadBaseId,
      precioVenta: parsed.data.precioVenta,
      precioCompra: parsed.data.precioCompra,
      stockMinimo: parsed.data.stockMinimo,
      controlaVencimiento: parsed.data.controlaVencimiento,
    },
  })

  revalidatePath("/productos")
  revalidatePath(`/productos/${id}/editar`)
  return { ok: true }
}

export async function toggleProductoActivo(id: string, activo: boolean) {
  await prisma.producto.update({ where: { id }, data: { activo } })
  revalidatePath("/productos")
  return { ok: true }
}
