"use server"

import { prisma } from "@/lib/prisma"
import { esquemaCuenta } from "@/lib/validaciones/cuentas"
import { revalidatePath } from "next/cache"
import { registrarMovimientoCajaEnTx } from "@/server/actions/caja"
import { requireRole, requireAdmin, requireSession } from "@/lib/auth-guards"
import { RolUsuario } from "@prisma/client"

export async function obtenerCuentas() {
  await requireSession()
  return prisma.cuenta.findMany({
    where: { deletedAt: null },
    include: {
      cliente: { select: { nombreRazonSocial: true } },
      proveedor: { select: { nombreRazonSocial: true } },
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function obtenerCuentaPorId(id: string) {
  await requireSession()
  return prisma.cuenta.findFirst({
    where: { id, deletedAt: null },
    include: {
      cliente: { select: { id: true, nombreRazonSocial: true, documento: true } },
      proveedor: { select: { id: true, nombreRazonSocial: true, documento: true } },
      movimientos: {
        orderBy: { fecha: "desc" },
        take: 50,
      },
    },
  })
}

export async function obtenerCuentasProveedores() {
  await requireSession()
  return prisma.cuenta.findMany({
    where: { tipo: "CORRIENTE", titular: "PROVEEDOR", deletedAt: null, activa: true },
    include: {
      proveedor: { select: { id: true, nombreRazonSocial: true } },
    },
    orderBy: [{ saldo: "desc" }, { nombre: "asc" }],
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Cobros y pagos
// ─────────────────────────────────────────────────────────────────────────────

export async function obtenerCuentasCorrientes() {
  await requireSession()
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
  concepto: string,
  clientRequestId?: string
) {
  const session = await requireRole(RolUsuario.ADMIN, RolUsuario.VENDEDOR)
  if (monto <= 0) return { error: "El monto debe ser mayor a 0" }
  if (!concepto.trim()) return { error: "Ingresá un concepto" }

  const cuenta = await prisma.cuenta.findUnique({ where: { id: cuentaId, deletedAt: null } })
  if (!cuenta) return { error: "Cuenta no encontrada" }

  // Validación rápida: no permitir cobros que excedan el saldo deudor.
  // Hay otra verificación dentro de la transacción para cubrir race conditions.
  if (monto > Number(cuenta.saldo)) {
    return { error: `El cobro ($${monto.toLocaleString("es-AR")}) no puede superar el saldo deudor del cliente ($${Number(cuenta.saldo).toLocaleString("es-AR")}).` }
  }

  let duplicada = false
  let excedido  = false

  await prisma.$transaction(async (tx) => {
    // Idempotency: si ya existe un movimiento con este clientRequestId, no duplicar
    if (clientRequestId) {
      const existente = await tx.movimientoCuenta.findUnique({
        where: { clientRequestId },
        select: { id: true },
      })
      if (existente) { duplicada = true; return }
    }

    // Relectura del saldo dentro de la transacción para detectar race conditions.
    const cuentaActual = await tx.cuenta.findUniqueOrThrow({
      where: { id: cuentaId },
      select: { saldo: true },
    })
    if (monto > Number(cuentaActual.saldo)) {
      excedido = true
      return // Aborta la tx (los efectos no se aplican)
    }

    // Decrement atómico sobre el saldo (evita lost-update)
    const cuentaActualizada = await tx.cuenta.update({
      where: { id: cuentaId },
      data:  { saldo: { decrement: monto } },
      select: { saldo: true },
    })
    const saldoPosterior = Number(cuentaActualizada.saldo)
    const saldoAnterior  = saldoPosterior + monto

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
        clientRequestId: clientRequestId ?? null,
      },
    })
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

  if (excedido) {
    // Salió de la transacción sin aplicar cambios — el saldo se movió entre la
    // validación inicial y la transacción (race condition).
    return { error: "El cobro no puede superar el saldo deudor del cliente. Refrescá la pantalla." }
  }

  revalidatePath("/cuentas")
  revalidatePath(`/cuentas/${cuentaId}`)
  revalidatePath("/caja")
  return { ok: true, cuentaId, duplicada }
}

export async function registrarPago(
  cuentaId: string,
  monto: number,
  concepto: string,
  clientRequestId?: string
) {
  const session = await requireRole(RolUsuario.ADMIN, RolUsuario.COMPRADOR)
  if (monto <= 0) return { error: "El monto debe ser mayor a 0" }
  if (!concepto.trim()) return { error: "Ingresá un concepto" }

  const cuenta = await prisma.cuenta.findUnique({ where: { id: cuentaId, deletedAt: null } })
  if (!cuenta) return { error: "Cuenta no encontrada" }

  // Validación rápida: no permitir pagos que excedan el saldo a pagar al proveedor.
  // Espejo del patrón de registrarCobro: hay otra verificación dentro de la
  // transacción para cubrir race conditions.
  if (monto > Number(cuenta.saldo)) {
    return { error: `El pago ($${monto.toLocaleString("es-AR")}) no puede superar el saldo adeudado al proveedor ($${Number(cuenta.saldo).toLocaleString("es-AR")}).` }
  }

  let duplicada = false
  let excedido  = false

  await prisma.$transaction(async (tx) => {
    if (clientRequestId) {
      const existente = await tx.movimientoCuenta.findUnique({
        where: { clientRequestId },
        select: { id: true },
      })
      if (existente) { duplicada = true; return }
    }

    // Relectura del saldo dentro de la transacción para detectar race conditions.
    const cuentaActual = await tx.cuenta.findUniqueOrThrow({
      where: { id: cuentaId },
      select: { saldo: true },
    })
    if (monto > Number(cuentaActual.saldo)) {
      excedido = true
      return // Aborta la tx (los efectos no se aplican)
    }

    const cuentaActualizada = await tx.cuenta.update({
      where: { id: cuentaId },
      data:  { saldo: { decrement: monto } },
      select: { saldo: true },
    })
    const saldoPosterior = Number(cuentaActualizada.saldo)
    const saldoAnterior  = saldoPosterior + monto

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
        clientRequestId: clientRequestId ?? null,
      },
    })
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

  if (excedido) {
    return { error: "El pago no puede superar el saldo adeudado al proveedor. Refrescá la pantalla." }
  }

  revalidatePath("/cuentas")
  revalidatePath(`/cuentas/${cuentaId}`)
  revalidatePath("/caja")
  return { ok: true, cuentaId, duplicada }
}

export async function crearCuenta(formData: unknown) {
  await requireAdmin()
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
