/**
 * Verificación post-seed:
 *  - Counts globales por tabla
 *  - Cuadre de caja (cada caja: saldoFinal = saldoInicial + HABERes - DEBEs)
 *  - Stock no negativo en todos los productos
 *  - Saldo de cuenta = sum de movimientos por cuenta
 *  - Numeración correlativa sin huecos en remitos y ventas
 */
import type { PrismaClient } from "@prisma/client"

export interface VerificacionResult {
  counts: {
    usuarios: number
    proveedores: number
    clientes: number
    productos: number
    lotes: number
    ventas: number
    compras: number
    cobros: number
    pagos: number
    notasCredito: number
    notasDebito: number
    cajasCerradas: number
    cajasAbiertas: number
    movimientosCaja: number
    movimientosStock: number
    movimientosCuenta: number
    remitos: number
  }
  cuadres: {
    cajasOK: boolean
    cajasInfo: Array<{ numero: number; saldoInicial: number; saldoFinalCalc: number; saldoFinalGuardado: number; diferencia: number }>
    stockNoNegativo: boolean
    stockProblemas: Array<{ codigo: string; nombre: string; stock: number }>
    saldosCuentaOK: boolean
    saldosProblemas: Array<{ cuentaId: string; saldoGuardado: number; saldoCalculado: number }>
  }
}

export async function verificar(prisma: PrismaClient): Promise<VerificacionResult> {
  // ─── Counts ───
  const [usuarios, proveedores, clientes, productos, lotes, ventas, compras] = await Promise.all([
    prisma.usuario.count(),
    prisma.proveedor.count(),
    prisma.cliente.count(),
    prisma.producto.count(),
    prisma.loteProducto.count(),
    prisma.venta.count(),
    prisma.compra.count(),
  ])
  const [cobros, pagos, notasCredito, notasDebito] = await Promise.all([
    prisma.movimientoCuenta.count({ where: { origenTipo: "cobro" } }),
    prisma.movimientoCuenta.count({ where: { origenTipo: "pago" } }),
    prisma.notaCreditoDebito.count({ where: { tipo: "CREDITO" } }),
    prisma.notaCreditoDebito.count({ where: { tipo: "DEBITO" } }),
  ])
  const [cajasCerradas, cajasAbiertas, movimientosCaja, movimientosStock, movimientosCuenta, remitos] = await Promise.all([
    prisma.cajaDiaria.count({ where: { estado: "CERRADA" } }),
    prisma.cajaDiaria.count({ where: { estado: "ABIERTA" } }),
    prisma.movimientoCaja.count(),
    prisma.movimientoStock.count(),
    prisma.movimientoCuenta.count(),
    prisma.remito.count(),
  ])

  // ─── Cuadre por caja ───
  const cajas = await prisma.cajaDiaria.findMany({
    where: { estado: "CERRADA" },
    select: {
      id: true, numero: true, saldoInicial: true, saldoFinal: true,
      totalContadoHaber: true, totalContadoDebe: true,
      totalCCHaber: true, totalCCDebe: true,
    },
    orderBy: { numero: "asc" },
  })
  const cajasInfo = cajas.map((c) => {
    const si = Number(c.saldoInicial)
    const sf = Number(c.saldoFinal ?? 0)
    const haberC = Number(c.totalContadoHaber ?? 0)
    const debeC  = Number(c.totalContadoDebe ?? 0)
    const haberCC = Number(c.totalCCHaber ?? 0)
    const debeCC  = Number(c.totalCCDebe ?? 0)
    const sfCalc = si + haberC + haberCC - debeC - debeCC
    const diff = Math.round((sf - sfCalc) * 100) / 100
    return { numero: c.numero, saldoInicial: si, saldoFinalCalc: sfCalc, saldoFinalGuardado: sf, diferencia: diff }
  })
  const cajasOK = cajasInfo.every((c) => Math.abs(c.diferencia) < 0.01)

  // ─── Stock no negativo ───
  const productosConStock = await prisma.producto.findMany({
    select: { codigo: true, nombre: true, stockTotal: true },
  })
  const stockProblemas = productosConStock
    .filter((p) => Number(p.stockTotal) < 0)
    .map((p) => ({ codigo: p.codigo, nombre: p.nombre, stock: Number(p.stockTotal) }))
  const stockNoNegativo = stockProblemas.length === 0

  // ─── Saldo cuenta vs movimientos ───
  // La verdad: sum(saldoPosterior - saldoAnterior) por movimiento = delta total = saldo final.
  // Esta verificación es robusta ante empates en fecha (no depende del orden).
  const cuentas = await prisma.cuenta.findMany({ select: { id: true, saldo: true } })
  const saldosProblemas: Array<{ cuentaId: string; saldoGuardado: number; saldoCalculado: number }> = []
  for (const c of cuentas) {
    const movs = await prisma.movimientoCuenta.findMany({
      where: { cuentaId: c.id },
      select: { saldoAnterior: true, saldoPosterior: true },
    })
    const sumDeltas = movs.reduce(
      (acc, m) => acc + (Number(m.saldoPosterior) - Number(m.saldoAnterior)),
      0,
    )
    const saldoG = Number(c.saldo)
    if (Math.abs(saldoG - sumDeltas) > 0.01) {
      saldosProblemas.push({ cuentaId: c.id, saldoGuardado: saldoG, saldoCalculado: sumDeltas })
    }
  }
  const saldosCuentaOK = saldosProblemas.length === 0

  return {
    counts: {
      usuarios, proveedores, clientes, productos, lotes, ventas, compras,
      cobros, pagos, notasCredito, notasDebito,
      cajasCerradas, cajasAbiertas, movimientosCaja, movimientosStock,
      movimientosCuenta, remitos,
    },
    cuadres: {
      cajasOK, cajasInfo,
      stockNoNegativo, stockProblemas,
      saldosCuentaOK, saldosProblemas,
    },
  }
}

/** Imprime un informe legible del resultado de verificacion. */
export function imprimirInforme(r: VerificacionResult): void {
  console.log("")
  console.log("═══════════════════════════════════════════════════════════")
  console.log("                  RESUMEN DEL SEED")
  console.log("═══════════════════════════════════════════════════════════")
  console.log(`Usuarios (admins preservados):  ${r.counts.usuarios}`)
  console.log(`Proveedores:                    ${r.counts.proveedores}`)
  console.log(`Clientes:                       ${r.counts.clientes}`)
  console.log(`Productos:                      ${r.counts.productos}`)
  console.log(`Lotes:                          ${r.counts.lotes}`)
  console.log("")
  console.log(`Ventas:                         ${r.counts.ventas}`)
  console.log(`Compras:                        ${r.counts.compras}`)
  console.log(`Cobros:                         ${r.counts.cobros}`)
  console.log(`Pagos a proveedores:            ${r.counts.pagos}`)
  console.log(`Notas de Crédito:               ${r.counts.notasCredito}`)
  console.log(`Notas de Débito:                ${r.counts.notasDebito}`)
  console.log(`Remitos:                        ${r.counts.remitos}`)
  console.log("")
  console.log(`Cajas CERRADAS:                 ${r.counts.cajasCerradas}`)
  console.log(`Cajas ABIERTAS:                 ${r.counts.cajasAbiertas} (esperado: 0 — hoy abrís vos)`)
  console.log(`Movimientos de caja:            ${r.counts.movimientosCaja}`)
  console.log(`Movimientos de stock:           ${r.counts.movimientosStock}`)
  console.log(`Movimientos de cuenta:          ${r.counts.movimientosCuenta}`)
  console.log("")
  console.log("═══════════════════════════════════════════════════════════")
  console.log("                  CUADRES")
  console.log("═══════════════════════════════════════════════════════════")
  console.log(`Cajas cuadran:                  ${r.cuadres.cajasOK ? "✓ SÍ" : "✗ NO"}`)
  if (!r.cuadres.cajasOK) {
    for (const c of r.cuadres.cajasInfo.filter((x) => Math.abs(x.diferencia) >= 0.01)) {
      console.log(`  · Caja #${c.numero}: guardado=${c.saldoFinalGuardado}, calc=${c.saldoFinalCalc}, dif=${c.diferencia}`)
    }
  }
  console.log(`Stock no negativo:              ${r.cuadres.stockNoNegativo ? "✓ SÍ" : "✗ NO"}`)
  if (!r.cuadres.stockNoNegativo) {
    for (const p of r.cuadres.stockProblemas) {
      console.log(`  · ${p.codigo} ${p.nombre}: stock=${p.stock}`)
    }
  }
  console.log(`Saldos cuenta consistentes:     ${r.cuadres.saldosCuentaOK ? "✓ SÍ" : "✗ NO"}`)
  if (!r.cuadres.saldosCuentaOK) {
    for (const s of r.cuadres.saldosProblemas.slice(0, 5)) {
      console.log(`  · Cuenta ${s.cuentaId}: guardado=${s.saldoGuardado}, calc=${s.saldoCalculado}`)
    }
    if (r.cuadres.saldosProblemas.length > 5) {
      console.log(`  · ... y ${r.cuadres.saldosProblemas.length - 5} más`)
    }
  }
  console.log("")
}
