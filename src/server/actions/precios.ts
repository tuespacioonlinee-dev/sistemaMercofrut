"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const itemSchema = z.object({
  id: z.string().min(1),
  precioVenta: z.number().min(0),
  precioCompra: z.number().min(0),
})

const actualizarPreciosSchema = z.array(itemSchema).min(1)

export async function actualizarPrecios(data: unknown) {
  const parsed = actualizarPreciosSchema.safeParse(data)
  if (!parsed.success) return { error: "Datos inválidos." }

  const updates = parsed.data

  await prisma.$transaction(
    updates.map((item) =>
      prisma.producto.update({
        where: { id: item.id },
        data: {
          precioVenta: item.precioVenta,
          precioCompra: item.precioCompra,
        },
      })
    )
  )

  revalidatePath("/productos")
  revalidatePath("/stock")
  revalidatePath("/precios")
  return { ok: true, cantidad: updates.length }
}
