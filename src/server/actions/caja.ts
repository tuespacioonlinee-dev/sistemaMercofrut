"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  esquemaAperturaCaja,
  esquemaCierreCaja,
  esquemaMovimientoCaja,
} from "@/lib/validaciones/caja"

// Obtener la caja abierta hoy (si existe)
export async function obtenerCajaAbierta() {
  return prisma.cajaDiaria.findFirst({
    where: { estado: "ABIERTA" },
    include: {
      abiertaPor: { select: { nombre: true } },
      movimientos: {
        orderBy: { fecha: "desc" },
        include: { usuario: { select: { nombre: true } } },
      },
    },
    orderBy: { fechaApertura: "desc" },
  })
}

// Historial de cajas cerradas
export async function obtenerHistorialCajas() {
  return prisma.cajaDiaria.findMany({
    where: { estado: "CERRADA" },
    include: {
      abiertaPor: { select: { nombre: true } },
      cerradaPor: { select: { nombre: true } },
    },
    orderBy: { fechaApertura: "desc" },
    take: 30,
  })
}

export async function abrirCaja(formData: unknown) {
  const session = await auth()
  if (!session) return { error: "No autorizado" }

  const parsed = esquemaAperturaCaja.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  // Verificar que no haya una caja abierta
  const cajaAbierta = await prisma.cajaDiaria.findFirst({
    where: { estado: "ABIERTA" },
  })
  if (cajaAbierta) return { error: "Ya hay una caja abierta. Cerrala antes de abrir una nueva." }

  await prisma.cajaDiaria.create({
    data: {
      saldoInicial: parsed.data.saldoInicial,
      observaciones: parsed.data.observaciones || null,
      abiertaPorId: session.user.id,
    },
  })

  revalidatePath("/caja")
  return { ok: true }
}

export async function cerrarCaja(cajaId: string, formData: unknown) {
  const session = await auth()
  if (!session) return { error: "No autorizado" }

  const parsed = esquemaCierreCaja.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const caja = await prisma.cajaDiaria.findUnique({
    where: { id: cajaId },
    include: { movimientos: true },
  })
  if (!caja) return { error: "Caja no encontrada" }
  if (caja.estado === "CERRADA") return { error: "La caja ya está cerrada" }

  // Calcular saldo final teórico
  const totalIngresos = caja.movimientos
    .filter((m) => m.tipo === "INGRESO")
    .reduce((acc, m) => acc + Number(m.monto), 0)

  const totalEgresos = caja.movimientos
    .filter((m) => m.tipo === "EGRESO")
    .reduce((acc, m) => acc + Number(m.monto), 0)

  const saldoFinal = Number(caja.saldoInicial) + totalIngresos - totalEgresos
  const diferencia = parsed.data.saldoArqueo - saldoFinal

  await prisma.cajaDiaria.update({
    where: { id: cajaId },
    data: {
      estado: "CERRADA",
      fechaCierre: new Date(),
      saldoFinal,
      saldoArqueo: parsed.data.saldoArqueo,
      diferencia,
      observaciones: parsed.data.observaciones || caja.observaciones || null,
      cerradaPorId: session.user.id,
    },
  })

  revalidatePath("/caja")
  return { ok: true }
}

export async function registrarMovimiento(cajaId: string, formData: unknown) {
  const session = await auth()
  if (!session) return { error: "No autorizado" }

  const parsed = esquemaMovimientoCaja.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const caja = await prisma.cajaDiaria.findUnique({ where: { id: cajaId } })
  if (!caja) return { error: "Caja no encontrada" }
  if (caja.estado === "CERRADA") return { error: "La caja ya está cerrada" }

  await prisma.movimientoCaja.create({
    data: {
      cajaId,
      tipo: parsed.data.tipo,
      categoria: parsed.data.categoria,
      monto: parsed.data.monto,
      descripcion: parsed.data.descripcion,
      usuarioId: session.user.id,
    },
  })

  revalidatePath("/caja")
  return { ok: true }
}
