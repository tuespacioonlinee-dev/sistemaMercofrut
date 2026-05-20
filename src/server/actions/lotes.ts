"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requireRole, requireSession } from "@/lib/auth-guards"
import { RolUsuario } from "@prisma/client"

export async function obtenerLotes() {
  await requireSession()
  return prisma.loteProducto.findMany({
    where: { activo: true },
    select: {
      id: true,
      numeroLote: true,
      fechaIngreso: true,
      fechaVencimiento: true,
      cantidadInicial: true,
      cantidadActual: true,
      producto: {
        select: {
          id: true,
          nombre: true,
          codigo: true,
          unidadBase: { select: { abreviatura: true } },
          categoria: { select: { nombre: true } },
        },
      },
    },
    orderBy: [{ fechaVencimiento: "asc" }, { fechaIngreso: "desc" }],
  })
}

export async function cerrarLote(id: string) {
  await requireRole(RolUsuario.ADMIN, RolUsuario.COMPRADOR)
  await prisma.loteProducto.update({
    where: { id },
    data: { activo: false },
  })
  revalidatePath("/lotes")
  return { ok: true }
}
