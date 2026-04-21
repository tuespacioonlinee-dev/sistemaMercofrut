"use server"

import { prisma } from "@/lib/prisma"
import { crearUsuarioSchema, editarUsuarioSchema } from "@/lib/validaciones/usuarios"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"

export async function obtenerUsuarios() {
  return prisma.usuario.findMany({
    where: { deletedAt: null },
    orderBy: { nombre: "asc" },
    select: {
      id: true,
      nombre: true,
      email: true,
      rol: true,
      activo: true,
      createdAt: true,
    },
  })
}

export async function obtenerUsuarioPorId(id: string) {
  return prisma.usuario.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      nombre: true,
      email: true,
      rol: true,
      activo: true,
    },
  })
}

export async function crearUsuario(formData: unknown) {
  const resultado = crearUsuarioSchema.safeParse(formData)
  if (!resultado.success) {
    return { error: resultado.error.issues[0]?.message ?? "Datos inválidos." }
  }

  const { nombre, email, password, rol } = resultado.data

  const existe = await prisma.usuario.findFirst({ where: { email, deletedAt: null } })
  if (existe) return { error: "Ya existe un usuario con ese email." }

  const passwordHash = await bcrypt.hash(password, 10)

  await prisma.usuario.create({
    data: { nombre, email, passwordHash, rol },
  })

  revalidatePath("/usuarios")
  return { ok: true }
}

export async function editarUsuario(id: string, formData: unknown) {
  const resultado = editarUsuarioSchema.safeParse(formData)
  if (!resultado.success) {
    return { error: resultado.error.issues[0]?.message ?? "Datos inválidos." }
  }

  const { nombre, email, password, rol, activo } = resultado.data

  const existe = await prisma.usuario.findFirst({
    where: { email, deletedAt: null, NOT: { id } },
  })
  if (existe) return { error: "Ya existe otro usuario con ese email." }

  const data: Parameters<typeof prisma.usuario.update>[0]["data"] = {
    nombre,
    email,
    rol,
    activo,
  }

  if (password && password.length > 0) {
    data.passwordHash = await bcrypt.hash(password, 10)
  }

  await prisma.usuario.update({ where: { id }, data })

  revalidatePath("/usuarios")
  revalidatePath(`/usuarios/${id}/editar`)
  return { ok: true }
}

export async function toggleActivoUsuario(id: string, activo: boolean) {
  await prisma.usuario.update({
    where: { id },
    data: { activo: !activo },
  })

  revalidatePath("/usuarios")
  return { ok: true }
}
