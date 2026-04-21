"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { categoriaSchema } from "@/lib/validaciones/categorias"

export async function crearCategoria(data: unknown) {
  const parsed = categoriaSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const existe = await prisma.categoria.findUnique({
    where: { nombre: parsed.data.nombre },
  })
  if (existe) return { error: "Ya existe una categoría con ese nombre" }

  await prisma.categoria.create({ data: parsed.data })
  revalidatePath("/categorias")
  return { ok: true }
}

export async function editarCategoria(id: string, data: unknown) {
  const parsed = categoriaSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const existe = await prisma.categoria.findFirst({
    where: { nombre: parsed.data.nombre, NOT: { id } },
  })
  if (existe) return { error: "Ya existe una categoría con ese nombre" }

  await prisma.categoria.update({ where: { id }, data: parsed.data })
  revalidatePath("/categorias")
  return { ok: true }
}

export async function toggleCategoriaActiva(id: string, activa: boolean) {
  await prisma.categoria.update({ where: { id }, data: { activa } })
  revalidatePath("/categorias")
  return { ok: true }
}
