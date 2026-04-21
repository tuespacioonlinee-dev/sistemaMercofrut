"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { unidadSchema } from "@/lib/validaciones/unidades"

export async function crearUnidad(data: unknown) {
  const parsed = unidadSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const existe = await prisma.unidadMedida.findFirst({
    where: {
      OR: [{ nombre: parsed.data.nombre }, { abreviatura: parsed.data.abreviatura }],
    },
  })
  if (existe) return { error: "Ya existe una unidad con ese nombre o abreviatura" }

  await prisma.unidadMedida.create({ data: parsed.data })
  revalidatePath("/unidades")
  return { ok: true }
}

export async function editarUnidad(id: string, data: unknown) {
  const parsed = unidadSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const existe = await prisma.unidadMedida.findFirst({
    where: {
      OR: [{ nombre: parsed.data.nombre }, { abreviatura: parsed.data.abreviatura }],
      NOT: { id },
    },
  })
  if (existe) return { error: "Ya existe una unidad con ese nombre o abreviatura" }

  await prisma.unidadMedida.update({ where: { id }, data: parsed.data })
  revalidatePath("/unidades")
  return { ok: true }
}

export async function toggleUnidadActiva(id: string, activa: boolean) {
  await prisma.unidadMedida.update({ where: { id }, data: { activa } })
  revalidatePath("/unidades")
  return { ok: true }
}
