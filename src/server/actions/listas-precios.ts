"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import {
  listaPrecioSchema,
  actualizarPreciosListaSchema,
} from "@/lib/validaciones/listas-precios"
import { requireRole, requireSession } from "@/lib/auth-guards"
import { RolUsuario } from "@prisma/client"

const ROLES_PRECIOS = [RolUsuario.ADMIN, RolUsuario.COMPRADOR] as const

// ─────────────────────────────────────────────────────────────────────────────
// Lecturas
// ─────────────────────────────────────────────────────────────────────────────

export async function obtenerListasPrecios() {
  await requireSession()
  return prisma.listaPrecio.findMany({
    where: { deletedAt: null },
    orderBy: [{ esDefault: "desc" }, { nombre: "asc" }],
    select: {
      id:          true,
      nombre:      true,
      descripcion: true,
      activa:      true,
      esDefault:   true,
      _count:      { select: { precios: true, clientes: true } },
    },
  })
}

export async function obtenerListaPrecioPorId(id: string) {
  await requireSession()
  return prisma.listaPrecio.findFirst({
    where: { id, deletedAt: null },
    include: {
      precios: {
        include: {
          producto: {
            select: {
              id: true,
              nombre: true,
              codigo: true,
              precioVenta: true,
              unidadBase: { select: { abreviatura: true } },
            },
          },
        },
      },
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutaciones
// ─────────────────────────────────────────────────────────────────────────────

export async function crearListaPrecio(data: unknown) {
  await requireRole(...ROLES_PRECIOS)
  const parsed = listaPrecioSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const yaExiste = await prisma.listaPrecio.findFirst({
    where: { nombre: parsed.data.nombre, deletedAt: null },
  })
  if (yaExiste) return { error: "Ya existe una lista con ese nombre" }

  await prisma.$transaction(async (tx) => {
    // Si la nueva lista es default, desmarcar las demás
    if (parsed.data.esDefault) {
      await tx.listaPrecio.updateMany({
        where: { esDefault: true },
        data:  { esDefault: false },
      })
    }
    await tx.listaPrecio.create({
      data: {
        nombre:      parsed.data.nombre,
        descripcion: parsed.data.descripcion || null,
        esDefault:   parsed.data.esDefault ?? false,
      },
    })
  })

  revalidatePath("/listas-precios")
  return { ok: true }
}

export async function editarListaPrecio(id: string, data: unknown) {
  await requireRole(...ROLES_PRECIOS)
  const parsed = listaPrecioSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const otraConMismoNombre = await prisma.listaPrecio.findFirst({
    where: { nombre: parsed.data.nombre, deletedAt: null, NOT: { id } },
  })
  if (otraConMismoNombre) return { error: "Ya existe otra lista con ese nombre" }

  await prisma.$transaction(async (tx) => {
    if (parsed.data.esDefault) {
      await tx.listaPrecio.updateMany({
        where: { esDefault: true, NOT: { id } },
        data:  { esDefault: false },
      })
    }
    await tx.listaPrecio.update({
      where: { id },
      data: {
        nombre:      parsed.data.nombre,
        descripcion: parsed.data.descripcion || null,
        esDefault:   parsed.data.esDefault ?? false,
      },
    })
  })

  revalidatePath("/listas-precios")
  revalidatePath(`/listas-precios/${id}`)
  return { ok: true }
}

export async function toggleListaPrecioActiva(id: string, activa: boolean) {
  await requireRole(...ROLES_PRECIOS)
  await prisma.listaPrecio.update({ where: { id }, data: { activa } })
  revalidatePath("/listas-precios")
  return { ok: true }
}

export async function actualizarPreciosLista(data: unknown) {
  await requireRole(...ROLES_PRECIOS)
  const parsed = actualizarPreciosListaSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { listaPrecioId, precios } = parsed.data

  await prisma.$transaction(
    precios.map((p) =>
      prisma.precioProducto.upsert({
        where:  { productoId_listaPrecioId: { productoId: p.productoId, listaPrecioId } },
        update: { precio: p.precio },
        create: { productoId: p.productoId, listaPrecioId, precio: p.precio },
      })
    )
  )

  revalidatePath(`/listas-precios/${listaPrecioId}`)
  return { ok: true, cantidad: precios.length }
}
