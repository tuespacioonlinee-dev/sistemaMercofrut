"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  esquemaAperturaCaja,
  esquemaCierreCaja,
  esquemaMovimientoCaja,
  resolverTipoMovCaja,
  type TipoMovCaja,
  type CategoriaMovCaja,
} from "@/lib/validaciones/caja"
import type { Prisma } from "@prisma/client"

// ─────────────────────────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────────────────────────

export async function obtenerCajaAbierta() {
  return prisma.cajaDiaria.findFirst({
    where: { estado: "ABIERTA" },
    include: {
      abiertaPor: { select: { nombre: true } },
      movimientos: {
        where: { deletedAt: null },
        orderBy: { fecha: "desc" },
        include: { usuario: { select: { nombre: true } } },
      },
    },
    orderBy: { fechaApertura: "desc" },
  })
}

export async function obtenerHistorialCajas(opts?: { cursor?: string; take?: number }) {
  const take = Math.min(opts?.take ?? 90, 200)
  return prisma.cajaDiaria.findMany({
    where: { estado: "CERRADA" },
    include: {
      abiertaPor: { select: { nombre: true } },
      cerradaPor: { select: { nombre: true } },
    },
    orderBy: { fechaApertura: "desc" },
    take,
    ...(opts?.cursor ? { skip: 1, cursor: { id: opts.cursor } } : {}),
  })
}

export async function obtenerCajaPorId(id: string) {
  return prisma.cajaDiaria.findUnique({
    where: { id },
    include: {
      abiertaPor: { select: { nombre: true } },
      cerradaPor: { select: { nombre: true } },
      movimientos: {
        where: { deletedAt: null },
        orderBy: { fecha: "asc" },
        include: { usuario: { select: { nombre: true } } },
      },
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Apertura
// ─────────────────────────────────────────────────────────────────────────────

export async function abrirCaja(formData: unknown) {
  const session = await auth()
  if (!session) return { error: "No autorizado" }

  const parsed = esquemaAperturaCaja.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const cajaAbierta = await prisma.cajaDiaria.findFirst({ where: { estado: "ABIERTA" } })
  if (cajaAbierta) return { error: "Ya hay una caja abierta. Cerrala antes de abrir una nueva." }

  await prisma.cajaDiaria.create({
    data: {
      saldoInicial: parsed.data.saldoInicial,
      observaciones: parsed.data.observaciones ?? null,
      abiertaPorId: session.user.id,
    },
  })

  revalidatePath("/caja")
  return { ok: true }
}

// ─────────────────────────────────────────────────────────────────────────────
// Cierre con totales por columna
// ─────────────────────────────────────────────────────────────────────────────

export async function cerrarCaja(cajaId: string, formData: unknown) {
  const session = await auth()
  if (!session) return { error: "No autorizado" }

  const parsed = esquemaCierreCaja.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const caja = await prisma.cajaDiaria.findUnique({
    where: { id: cajaId },
    include: { movimientos: { where: { deletedAt: null } } },
  })
  if (!caja) return { error: "Caja no encontrada" }
  if (caja.estado === "CERRADA") return { error: "La caja ya está cerrada" }

  // Calcular subtotales por columna contable
  const sumar = (tipo: TipoMovCaja) =>
    caja.movimientos
      .filter((m) => m.tipo === tipo)
      .reduce((acc, m) => acc + Number(m.monto), 0)

  const totalContadoHaber = sumar("CONTADO_HABER")
  const totalContadoDebe  = sumar("CONTADO_DEBE")
  const totalCCHaber      = sumar("CC_HABER")
  const totalCCDebe       = sumar("CC_DEBE")

  // Saldo final teórico = saldoInicial + (ContadoHaber - ContadoDebe)
  // La columna CC no impacta el saldo físico de caja
  const saldoFinal =
    Number(caja.saldoInicial) + totalContadoHaber - totalContadoDebe

  const diferencia = parsed.data.saldoArqueo - saldoFinal

  // Si el arqueo no coincide con el saldo esperado, las observaciones
  // pasan a ser obligatorias — el operador debe explicar el motivo.
  const haDiferencia = Math.abs(diferencia) > 0.005
  const obsTrim = parsed.data.observaciones?.trim() ?? ""
  if (haDiferencia && obsTrim.length === 0) {
    const signo = diferencia > 0 ? "+" : "−"
    const abs = Math.abs(diferencia).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    return {
      error: `Tenés una diferencia de ${signo}$${abs} entre el arqueo y el saldo esperado. Indicá el motivo en "Observaciones".`,
    }
  }

  await prisma.cajaDiaria.update({
    where: { id: cajaId },
    data: {
      estado:            "CERRADA",
      fechaCierre:       new Date(),
      saldoFinal,
      saldoArqueo:       parsed.data.saldoArqueo,
      diferencia,
      observaciones:     parsed.data.observaciones ?? caja.observaciones ?? null,
      cerradaPorId:      session.user.id,
      totalContadoHaber,
      totalContadoDebe,
      totalCCHaber,
      totalCCDebe,
    },
  })

  revalidatePath("/caja")
  revalidatePath("/caja/historial")
  return { ok: true }
}

// ─────────────────────────────────────────────────────────────────────────────
// Movimiento manual (formulario)
// ─────────────────────────────────────────────────────────────────────────────

export async function registrarMovimiento(cajaId: string, formData: unknown) {
  const session = await auth()
  if (!session) return { error: "No autorizado" }

  const parsed = esquemaMovimientoCaja.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  if (parsed.data.categoria === "OTRO" && !parsed.data.ladoOtro) {
    return { error: "Indicá si el movimiento es DEBE o HABER" }
  }

  const caja = await prisma.cajaDiaria.findUnique({ where: { id: cajaId } })
  if (!caja) return { error: "Caja no encontrada" }
  if (caja.estado === "CERRADA") return { error: "La caja ya está cerrada" }

  const tipo = resolverTipoMovCaja(parsed.data.categoria, parsed.data.ladoOtro)

  await prisma.movimientoCaja.create({
    data: {
      cajaId,
      tipo,
      categoria: parsed.data.categoria,
      monto:      parsed.data.monto,
      descripcion: parsed.data.descripcion,
      usuarioId:  session.user.id,
    },
  })

  revalidatePath("/caja")
  return { ok: true }
}

// ─────────────────────────────────────────────────────────────────────────────
// API interna — usada por ventas, cobros, etc.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Registra un movimiento de caja automático dentro de una transacción existente.
 * NO llama a revalidatePath — lo hace el llamador.
 */
export async function registrarMovimientoCajaEnTx(
  tx: Prisma.TransactionClient,
  params: {
    tipo: TipoMovCaja
    categoria: CategoriaMovCaja
    monto: number
    descripcion: string
    usuarioId: string
    origenTipo?: string
    origenId?: string
  }
) {
  const cajaAbierta = await tx.cajaDiaria.findFirst({ where: { estado: "ABIERTA" } })
  if (!cajaAbierta) return // Si no hay caja abierta, no registra (diseño intencional)

  await tx.movimientoCaja.create({
    data: {
      cajaId:      cajaAbierta.id,
      tipo:        params.tipo,
      categoria:   params.categoria,
      monto:       params.monto,
      descripcion: params.descripcion,
      usuarioId:   params.usuarioId,
      origenTipo:  params.origenTipo ?? null,
      origenId:    params.origenId   ?? null,
    },
  })
}
