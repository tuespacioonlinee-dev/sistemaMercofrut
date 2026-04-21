"use server"

import { prisma } from "@/lib/prisma"
import { esquemaCuenta } from "@/lib/validaciones/cuentas"
import { revalidatePath } from "next/cache"

export async function obtenerCuentas() {
  return prisma.cuenta.findMany({
    where: { deletedAt: null },
    include: {
      cliente: { select: { nombreRazonSocial: true } },
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function obtenerCuentaPorId(id: string) {
  return prisma.cuenta.findFirst({
    where: { id, deletedAt: null },
    include: {
      cliente: { select: { id: true, nombreRazonSocial: true, documento: true } },
      movimientos: {
        orderBy: { fecha: "desc" },
        take: 50,
      },
    },
  })
}

export async function crearCuenta(formData: unknown) {
  const resultado = esquemaCuenta.safeParse(formData)

  if (!resultado.success) {
    return { error: "Datos inválidos. Revisá los campos marcados." }
  }

  const data = resultado.data

  // Verificar que el cliente existe
  const cliente = await prisma.cliente.findFirst({
    where: { id: data.clienteId, deletedAt: null },
  })

  if (!cliente) {
    return { error: "El cliente seleccionado no existe." }
  }

  // Verificar que no exista ya una cuenta del mismo tipo para este cliente
  const existente = await prisma.cuenta.findFirst({
    where: {
      clienteId: data.clienteId,
      tipo: data.tipo,
      deletedAt: null,
    },
  })

  if (existente) {
    return { error: `Este cliente ya tiene una cuenta de tipo ${data.tipo === "CORRIENTE" ? "Cuenta Corriente" : "Contado"}.` }
  }

  const cuenta = await prisma.cuenta.create({
    data: {
      nombre: data.nombre,
      tipo: data.tipo,
      titular: "CLIENTE",
      clienteId: data.clienteId,
      saldo: 0,
    },
  })

  revalidatePath("/cuentas")
  return { ok: true, id: cuenta.id }
}
