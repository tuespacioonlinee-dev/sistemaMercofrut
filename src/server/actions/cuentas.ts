"use server"

import { prisma } from "@/lib/prisma"
import { esquemaCuenta } from "@/lib/validaciones/cuentas"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { registrarMovimientoCajaEnTx } from "@/server/actions/caja"

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

// ─────────────────────────────────────────────────────────────────────────────
// Cobros y pagos
// ─────────────────────────────────────────────────────────────────────────────

export async function obtenerCuentasCorrientes() {
  return prisma.cuenta.findMany({
    where: { tipo: "CORRIENTE", titular: "CLIENTE", deletedAt: null, activa: true },
    include: {
      cliente: { select: { id: true, nombreRazonSocial: true } },
    },
    orderBy: [{ saldo: "desc" }, { nombre: "asc" }],
  })
}

export async function registrarCobro(
  cuentaId: string,
  monto: number,
  concepto: string
) {
  const session = await auth()
  if (!session) return { error: "No autorizado" }
  if (monto <= 0) return { error: "El monto debe ser mayor a 0" }
  if (!concepto.trim()) return { error: "Ingresá un concepto" }

  const cuenta = await prisma.cuenta.findUnique({ where: { id: cuentaId, deletedAt: null } })
  if (!cuenta) return { error: "Cuenta no encontrada" }

  const saldoAnterior = Number(cuenta.saldo)
  const saldoPosterior = saldoAnterior - monto

  await prisma.$transaction(async (tx) => {
    await tx.movimientoCuenta.create({
      data: {
        cuentaId,
        tipo: "HABER",
        monto,
        saldoAnterior,
        saldoPosterior,
        descripcion: concepto,
        usuarioId: session.user.id,
        origenTipo: "COBRO_CLIENTE",
        origenId: cuentaId,
      },
    })
    await tx.cuenta.update({ where: { id: cuentaId }, data: { saldo: saldoPosterior } })
    await registrarMovimientoCajaEnTx(tx, {
      tipo: "CC_HABER",
      categoria: "COBRO_CLIENTE",
      monto,
      descripcion: `Cobro CC: ${concepto}`,
      usuarioId: session.user.id,
      origenTipo: "COBRO_CLIENTE",
      origenId: cuentaId,
    })
  })

  revalidatePath("/cuentas")
  revalidatePath(`/cuentas/${cuentaId}`)
  revalidatePath("/caja")
  return { ok: true, cuentaId }
}

export async function registrarPago(
  cuentaId: string,
  monto: number,
  concepto: string
) {
  const session = await auth()
  if (!session) return { error: "No autorizado" }
  if (monto <= 0) return { error: "El monto debe ser mayor a 0" }
  if (!concepto.trim()) return { error: "Ingresá un concepto" }

  const cuenta = await prisma.cuenta.findUnique({ where: { id: cuentaId, deletedAt: null } })
  if (!cuenta) return { error: "Cuenta no encontrada" }

  const saldoAnterior = Number(cuenta.saldo)
  const saldoPosterior = saldoAnterior - monto

  await prisma.$transaction(async (tx) => {
    await tx.movimientoCuenta.create({
      data: {
        cuentaId,
        tipo: "HABER",
        monto,
        saldoAnterior,
        saldoPosterior,
        descripcion: concepto,
        usuarioId: session.user.id,
        origenTipo: "PAGO_PROVEEDOR",
        origenId: cuentaId,
      },
    })
    await tx.cuenta.update({ where: { id: cuentaId }, data: { saldo: saldoPosterior } })
    await registrarMovimientoCajaEnTx(tx, {
      tipo: "CC_DEBE",
      categoria: "PAGO_PROVEEDOR",
      monto,
      descripcion: `Pago prov: ${concepto}`,
      usuarioId: session.user.id,
      origenTipo: "PAGO_PROVEEDOR",
      origenId: cuentaId,
    })
  })

  revalidatePath("/cuentas")
  revalidatePath(`/cuentas/${cuentaId}`)
  revalidatePath("/caja")
  return { ok: true, cuentaId }
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
