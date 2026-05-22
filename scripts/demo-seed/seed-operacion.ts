/**
 * Seed de operación: 5 días de historial (configurable).
 *
 * Cada día corre en su propia $transaction (para evitar timeouts):
 *   1. Apertura de caja
 *   2. Compras del día (algunas CONTADO, otras CC)
 *   3. Ventas del día (50/50 CONTADO/CC, distribuidas entre clientes)
 *   4. Cobros a clientes con deuda CC
 *   5. Pagos a proveedores
 *   6. Gastos del día
 *   7. Cierre de caja cuadrado (saldoArqueo = saldoFinal, diferencia = 0)
 *
 * Adicionalmente reparte ~3 Notas de Crédito y ~2 Notas de Débito entre todos
 * los días para que aparezcan en reportes.
 *
 * Reglas de coherencia:
 *  - Stock no puede ser negativo: la cantidad vendida por línea está acotada
 *    por el stock disponible al momento (calculado a partir de los lotes).
 *  - Caja cuadra al cierre: saldoFinal = saldoInicial + sum(HABER) - sum(DEBE).
 *  - Numeración: usa autoincrement de Postgres para Venta.numero y CajaDiaria.numero.
 *    Remitos: usa contador local sincronizado con ParametrosComprobante.proximoRemito.
 */
import { type PrismaClient, type Prisma } from "@prisma/client"
import { TX_OPCIONES_GRANDES, dec, decQty } from "./helpers-prisma"
import { CLIENTES } from "./data/clientes"
import { PROVEEDORES } from "./data/proveedores"
import { PRODUCTOS } from "./data/productos"
import { diaHabilHaceNDias, aHoraApertura, aHoraCierre, aHoraHabil } from "./helpers-fechas"
import type { CatalogoResult } from "./seed-catalogo"

export interface OperacionResult {
  ventas: number
  compras: number
  cobros: number
  pagos: number
  gastos: number
  notasCredito: number
  notasDebito: number
  cajasCerradas: number
}

/** Generador determinístico pseudo-random (Mulberry32 - rápido y reproducible). */
function rng(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6D2B79F5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Plan por día: cantidad de ventas/compras. */
const PLAN_VENTAS_POR_DIA = [20, 25, 22, 28, 30]  // ascendente — sugiere crecimiento
const PLAN_COMPRAS_POR_DIA = [5, 4, 6, 5, 5]

interface ContextoOp {
  adminId: string
  puntoVenta: number
  proximoRemito: number  // contador local, sincronizado al final con ParametrosComprobante
}

export async function seedOperacion(
  prisma: PrismaClient,
  catalogo: CatalogoResult,
  cuentas: {
    cuentaIdPorClienteCodigo: Map<string, string>      // solo clientes con maxCredito (CC)
    cuentaIdPorProveedorCodigo: Map<string, string>
  },
  opts: { adminId: string; dias: number },
): Promise<OperacionResult> {
  const acumulado: OperacionResult = {
    ventas: 0, compras: 0, cobros: 0, pagos: 0, gastos: 0,
    notasCredito: 0, notasDebito: 0, cajasCerradas: 0,
  }

  // Punto de venta del negocio (asumimos 1 si no hay parámetro configurado).
  const param = await prisma.parametrosComprobante.findFirst()
  const puntoVenta = param?.puntoVenta ?? 1
  const proximoRemitoInicial = param?.proximoRemito ?? 1
  const ctx: ContextoOp = { adminId: opts.adminId, puntoVenta, proximoRemito: proximoRemitoInicial }

  // Crear cuentas CONTADO para todos los clientes (necesarias para ventas contado).
  // Ya tenemos las CORRIENTE creadas en seedCuentasCorrientes. Las CONTADO
  // las creamos acá para que las venta-contado puedan referenciar una cuenta.
  const cuentaContadoPorCliente = new Map<string, string>()
  await prisma.$transaction(async (tx) => {
    for (const c of CLIENTES) {
      const clienteId = catalogo.clienteIdPorCodigo.get(c.codigo)!
      const cta = await tx.cuenta.create({
        data: {
          nombre:    `Contado - ${c.nombreRazonSocial}`,
          tipo:      "CONTADO",
          titular:   "CLIENTE",
          clienteId,
          saldo:     dec(0),
          activa:    true,
        },
      })
      cuentaContadoPorCliente.set(c.codigo, cta.id)
    }
  }, TX_OPCIONES_GRANDES)

  // Notas a distribuir: 3 NC en días -4, -3, -2; 2 ND en días -3, -1.
  // Si dias < 5, las repartimos en los disponibles.
  const planNotas = generarPlanNotas(opts.dias)

  // Subset de 6 proveedores principales (Juan: "distribuir compras entre 5-6").
  // Determinístico: tomamos los códigos 20001-20006.
  const codigosProveedoresActivos = PROVEEDORES.slice(0, 6).map((p) => p.codigo)

  // Iterar de día -dias a día -1 (orden cronológico).
  for (let dia = opts.dias; dia >= 1; dia--) {
    const fechaBase = diaHabilHaceNDias(dia)
    const seedDia = fechaBase.getTime() & 0x7FFFFFFF // determinístico por fecha
    const random = rng(seedDia)

    const r = await seedDiaIndividual(prisma, {
      fechaBase,
      diaIdx: opts.dias - dia, // 0,1,2,3,4
      random,
      ctx,
      catalogo,
      cuentaContadoPorCliente,
      cuentaCCPorCliente: cuentas.cuentaIdPorClienteCodigo,
      cuentaProveedor: cuentas.cuentaIdPorProveedorCodigo,
      codigosProveedoresActivos,
      planNotasDelDia: planNotas.get(dia) ?? { credito: 0, debito: 0 },
    })

    acumulado.ventas       += r.ventas
    acumulado.compras      += r.compras
    acumulado.cobros       += r.cobros
    acumulado.pagos        += r.pagos
    acumulado.gastos       += r.gastos
    acumulado.notasCredito += r.notasCredito
    acumulado.notasDebito  += r.notasDebito
    acumulado.cajasCerradas++
  }

  // Sincronizar el contador del próximo remito con lo que generamos.
  if (param) {
    await prisma.parametrosComprobante.update({
      where: { id: param.id },
      data:  { proximoRemito: ctx.proximoRemito },
    })
  }

  return acumulado
}

// ────────────────────────────────────────────────────────────────────────────
// Plan de notas: qué día se emite cada NC/ND
// ────────────────────────────────────────────────────────────────────────────

function generarPlanNotas(dias: number): Map<number, { credito: number; debito: number }> {
  const plan = new Map<number, { credito: number; debito: number }>()
  // 3 NC y 2 ND repartidas según dias disponibles.
  // Si dias >= 5, usamos -4, -3, -2 para NC y -3, -1 para ND.
  // Para menos días, las repartimos uniforme.
  if (dias >= 5) {
    plan.set(4, { credito: 1, debito: 0 })
    plan.set(3, { credito: 1, debito: 1 })
    plan.set(2, { credito: 1, debito: 0 })
    plan.set(1, { credito: 0, debito: 1 })
  } else {
    // 1 por día, primero NC, luego ND
    const total = Math.min(5, dias)
    let nc = 3, nd = 2
    for (let d = total; d >= 1 && (nc > 0 || nd > 0); d--) {
      const entry: { credito: number; debito: number } = { credito: 0, debito: 0 }
      if (nc > 0) { entry.credito = 1; nc-- }
      else if (nd > 0) { entry.debito = 1; nd-- }
      plan.set(d, entry)
    }
  }
  return plan
}

// ────────────────────────────────────────────────────────────────────────────
// Día individual: 1 transacción atómica
// ────────────────────────────────────────────────────────────────────────────

interface DiaInput {
  fechaBase: Date
  diaIdx: number
  random: () => number
  ctx: ContextoOp
  catalogo: CatalogoResult
  cuentaContadoPorCliente: Map<string, string>
  cuentaCCPorCliente: Map<string, string>
  cuentaProveedor: Map<string, string>
  /** Subset de códigos de proveedores entre los que se reparten compras (5-6 típicamente). */
  codigosProveedoresActivos: string[]
  planNotasDelDia: { credito: number; debito: number }
}

async function seedDiaIndividual(prisma: PrismaClient, d: DiaInput): Promise<OperacionResult> {
  const r: OperacionResult = {
    ventas: 0, compras: 0, cobros: 0, pagos: 0, gastos: 0,
    notasCredito: 0, notasDebito: 0, cajasCerradas: 0,
  }

  return await prisma.$transaction(async (tx) => {
    // ───── 1. Apertura de caja ─────
    const saldoInicial = 30_000 + Math.round(d.random() * 20_000)
    const caja = await tx.cajaDiaria.create({
      data: {
        saldoInicial: dec(saldoInicial),
        estado: "ABIERTA",
        fechaApertura: aHoraApertura(d.fechaBase),
        abiertaPorId: d.ctx.adminId,
      },
    })

    // Trackers locales para el cierre (Decimal accum).
    let totalContadoHaber = 0
    let totalContadoDebe = 0
    let totalCCHaber = 0
    let totalCCDebe = 0

    // ───── 2. Compras del día ─────
    const cantCompras = PLAN_COMPRAS_POR_DIA[d.diaIdx] ?? 5
    for (let i = 0; i < cantCompras; i++) {
      // Solo entre los 5-6 proveedores activos del día.
      const codigoProv = d.codigosProveedoresActivos[Math.floor(d.random() * d.codigosProveedoresActivos.length)]
      const prov = PROVEEDORES.find((p) => p.codigo === codigoProv)!
      const proveedorId = d.catalogo.proveedorIdPorCodigo.get(prov.codigo)!

      const condicion = d.random() < 0.4 ? "CONTADO" : "CUENTA_CORRIENTE"
      const hora = aHoraHabil(d.fechaBase, 8 * 60 + i * 30)

      const compra = await crearCompra(tx, {
        ctx: d.ctx,
        proveedorId,
        proveedorCondicionIva: prov.condicionIva,
        cuentaProveedorId: d.cuentaProveedor.get(prov.codigo)!,
        condicion,
        fecha: hora,
        catalogo: d.catalogo,
        random: d.random,
      })

      if (condicion === "CONTADO") {
        await tx.movimientoCaja.create({
          data: {
            cajaId: caja.id,
            tipo: "CONTADO_DEBE",
            categoria: "COMPRA_CONTADO",
            monto: dec(compra.total),
            descripcion: `Compra ${prov.nombreRazonSocial}`,
            fecha: hora,
            usuarioId: d.ctx.adminId,
            origenTipo: "compra",
            origenId: compra.id,
          },
        })
        totalContadoDebe += compra.total
      } else {
        // Compra CC: queda asentada en columna CC_HABER (le debemos al proveedor).
        await tx.movimientoCaja.create({
          data: {
            cajaId: caja.id,
            tipo: "CC_HABER",
            categoria: "PAGO_PROVEEDOR",
            monto: dec(compra.total),
            descripcion: `Compra CC ${prov.nombreRazonSocial}`,
            fecha: hora,
            usuarioId: d.ctx.adminId,
            origenTipo: "compra",
            origenId: compra.id,
          },
        })
        totalCCHaber += compra.total
      }
      r.compras++
    }

    // ───── 3. Ventas del día ─────
    const cantVentas = PLAN_VENTAS_POR_DIA[d.diaIdx] ?? 25
    const ventasIds: string[] = []
    for (let i = 0; i < cantVentas; i++) {
      // Distribución no uniforme: los primeros 5 clientes compran más.
      const u = d.random()
      let cliIdx: number
      if (u < 0.5) cliIdx = Math.floor(d.random() * 5)        // 50%: top 5 clientes
      else if (u < 0.85) cliIdx = 5 + Math.floor(d.random() * 5)  // 35%: clientes 6-10
      else cliIdx = 10 + Math.floor(d.random() * 5)           // 15%: clientes 11-15

      const cli = CLIENTES[cliIdx]
      const clienteId = d.catalogo.clienteIdPorCodigo.get(cli.codigo)!

      // Si no tiene maxCredito → forzar CONTADO. Si tiene → 50/50.
      const puedeCC = cli.maxCredito !== null && d.cuentaCCPorCliente.has(cli.codigo)
      const condicion = puedeCC && d.random() < 0.5 ? "CUENTA_CORRIENTE" : "CONTADO"
      const cuentaId = condicion === "CUENTA_CORRIENTE"
        ? d.cuentaCCPorCliente.get(cli.codigo)!
        : d.cuentaContadoPorCliente.get(cli.codigo)!

      const horaVenta = aHoraHabil(d.fechaBase, 10 * 60 + i * 15)

      const venta = await crearVenta(tx, {
        ctx: d.ctx,
        clienteId,
        cuentaId,
        condicion,
        fecha: horaVenta,
        catalogo: d.catalogo,
        random: d.random,
      })
      if (!venta) continue // sin stock suficiente, omitir
      ventasIds.push(venta.id)

      // Movimiento de caja
      if (condicion === "CONTADO") {
        await tx.movimientoCaja.create({
          data: {
            cajaId: caja.id,
            tipo: "CONTADO_HABER",
            categoria: "VENTA_CONTADO",
            monto: dec(venta.total),
            descripcion: `Venta #${venta.numero} — Remito ${venta.remitoNumero}`,
            fecha: horaVenta,
            usuarioId: d.ctx.adminId,
            origenTipo: "venta",
            origenId: venta.id,
          },
        })
        totalContadoHaber += venta.total
      } else {
        await tx.movimientoCaja.create({
          data: {
            cajaId: caja.id,
            tipo: "CC_DEBE",
            categoria: "COBRO_CLIENTE",
            monto: dec(venta.total),
            descripcion: `Venta CC #${venta.numero}`,
            fecha: horaVenta,
            usuarioId: d.ctx.adminId,
            origenTipo: "venta",
            origenId: venta.id,
          },
        })
        totalCCDebe += venta.total
      }
      r.ventas++
    }

    // ───── 4. Cobros a clientes con deuda CC ─────
    const cantCobros = 2 + Math.floor(d.random() * 2) // 2-3 cobros
    for (let i = 0; i < cantCobros; i++) {
      const cobro = await registrarCobroOpcional(tx, {
        ctx: d.ctx,
        cajaId: caja.id,
        cuentaCCPorCliente: d.cuentaCCPorCliente,
        fecha: aHoraHabil(d.fechaBase, 14 * 60 + i * 20),
        random: d.random,
      })
      if (cobro) {
        totalCCHaber += cobro.monto
        r.cobros++
      }
    }

    // ───── 5. Pago a proveedor (1 por día) ─────
    if (cantVentas > 0) {
      const pago = await registrarPagoOpcional(tx, {
        ctx: d.ctx,
        cajaId: caja.id,
        cuentaProveedor: d.cuentaProveedor,
        fecha: aHoraHabil(d.fechaBase, 16 * 60),
        random: d.random,
      })
      if (pago) {
        totalCCDebe += pago.monto
        r.pagos++
      }
    }

    // ───── 6. Gasto chico del día ─────
    const montoGasto = 5_000 + Math.round(d.random() * 15_000)
    const descripcionesGasto = ["Combustible camión", "Mantenimiento heladera", "Bolsas y embalajes", "Servicio limpieza", "Papelería"]
    const descGasto = descripcionesGasto[Math.floor(d.random() * descripcionesGasto.length)]
    await tx.movimientoCaja.create({
      data: {
        cajaId: caja.id,
        tipo: "CONTADO_DEBE",
        categoria: "GASTO",
        monto: dec(montoGasto),
        descripcion: descGasto,
        fecha: aHoraHabil(d.fechaBase, 17 * 60),
        usuarioId: d.ctx.adminId,
        origenTipo: "gasto",
        origenId: null,
      },
    })
    totalContadoDebe += montoGasto
    r.gastos++

    // ───── 7. Notas de Crédito / Débito programadas para este día ─────
    if (d.planNotasDelDia.credito > 0 && ventasIds.length > 0) {
      for (let i = 0; i < d.planNotasDelDia.credito; i++) {
        const ventaIdx = Math.floor(d.random() * ventasIds.length)
        const ventaId = ventasIds[ventaIdx]
        await crearNota(tx, {
          ctx: d.ctx,
          ventaId,
          tipo: "CREDITO",
          fecha: aHoraHabil(d.fechaBase, 17 * 60 + 15),
          motivo: "Devolución parcial por calidad de mercadería",
          random: d.random,
        })
        r.notasCredito++
      }
    }
    if (d.planNotasDelDia.debito > 0 && ventasIds.length > 0) {
      for (let i = 0; i < d.planNotasDelDia.debito; i++) {
        const ventaIdx = Math.floor(d.random() * ventasIds.length)
        const ventaId = ventasIds[ventaIdx]
        await crearNota(tx, {
          ctx: d.ctx,
          ventaId,
          tipo: "DEBITO",
          fecha: aHoraHabil(d.fechaBase, 17 * 60 + 30),
          motivo: "Ajuste por diferencia de precios facturados",
          random: d.random,
        })
        r.notasDebito++
      }
    }

    // ───── 8. Cierre de caja CUADRADO ─────
    const saldoFinalCalculado = saldoInicial + (totalContadoHaber + totalCCHaber) - (totalContadoDebe + totalCCDebe)
    await tx.cajaDiaria.update({
      where: { id: caja.id },
      data: {
        estado:            "CERRADA",
        fechaCierre:       aHoraCierre(d.fechaBase),
        saldoFinal:        dec(saldoFinalCalculado),
        saldoArqueo:       dec(saldoFinalCalculado),       // cuadrado
        diferencia:        dec(0),                          // sin diferencia
        cerradaPorId:      d.ctx.adminId,
        totalContadoHaber: dec(totalContadoHaber),
        totalContadoDebe:  dec(totalContadoDebe),
        totalCCHaber:      dec(totalCCHaber),
        totalCCDebe:       dec(totalCCDebe),
        observaciones:     "Cierre del día (seed demo)",
      },
    })
    r.cajasCerradas++

    return r
  }, TX_OPCIONES_GRANDES)
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers — crearVenta, crearCompra, etc
// ────────────────────────────────────────────────────────────────────────────

interface CrearVentaInput {
  ctx: ContextoOp
  clienteId: string
  cuentaId: string
  condicion: "CONTADO" | "CUENTA_CORRIENTE"
  fecha: Date
  catalogo: CatalogoResult
  random: () => number
}

/** Crea una venta con 1-4 líneas, descuenta stock FIFO de lotes, crea remito.
 *  Retorna null si no hay stock suficiente para ninguna línea. */
async function crearVenta(
  tx: Prisma.TransactionClient,
  input: CrearVentaInput,
): Promise<{ id: string; numero: number; total: number; remitoNumero: string } | null> {
  const cantLineas = 1 + Math.floor(input.random() * 4) // 1-4 productos por venta
  const productosUsados = new Set<string>()
  const lineas: Array<{
    productoId: string
    unidadId: string
    cantidad: number
    precioUnitario: number
    subtotal: number
  }> = []

  for (let i = 0; i < cantLineas; i++) {
    const pIdx = Math.floor(input.random() * PRODUCTOS.length)
    const p = PRODUCTOS[pIdx]
    if (productosUsados.has(p.codigo)) continue
    productosUsados.add(p.codigo)

    const productoId = input.catalogo.productoIdPorCodigo.get(p.codigo)!
    const unidadId   = input.catalogo.unidadIdPorAbrev.get(p.unidadAbrev)!

    // Stock disponible actual (recargado en tx para precisión)
    const prod = await tx.producto.findUnique({ where: { id: productoId }, select: { stockTotal: true } })
    const disponible = Number(prod?.stockTotal ?? 0)
    if (disponible <= 0.001) continue

    // Vendemos entre 1 y 5 unidades, sin pasar el stock disponible.
    const maxVendible = Math.min(5, Math.floor(disponible))
    if (maxVendible < 1) continue
    const cantidad = 1 + Math.floor(input.random() * maxVendible)
    const precio = p.precioVenta
    const subtotal = cantidad * precio

    lineas.push({ productoId, unidadId, cantidad, precioUnitario: precio, subtotal })
  }

  if (lineas.length === 0) return null

  const subtotalVenta = lineas.reduce((acc, l) => acc + l.subtotal, 0)
  // 10% de probabilidad de descuento (5-10%).
  const descuento = input.random() < 0.1 ? Math.round(subtotalVenta * (0.05 + input.random() * 0.05)) : 0
  const total = subtotalVenta - descuento

  // Observación ocasional (20%).
  const observaciones = input.random() < 0.2
    ? ["Cliente habitual", "Entrega coordinada", "Pago en 24hs", "Reparto temprano"][Math.floor(input.random() * 4)]
    : null

  const venta = await tx.venta.create({
    data: {
      fecha:        input.fecha,
      clienteId:    input.clienteId,
      cuentaId:     input.cuentaId,
      condicion:    input.condicion,
      subtotal:     dec(subtotalVenta),
      descuento:    dec(descuento),
      total:        dec(total),
      estado:       "CONFIRMADA",
      observaciones,
      creadaPorId:  input.ctx.adminId,
      detalles: {
        create: lineas.map((l) => ({
          productoId:     l.productoId,
          unidadId:       l.unidadId,
          cantidad:       decQty(l.cantidad),
          cantidadBase:   decQty(l.cantidad),    // unidad base = unidad de venta
          precioUnitario: dec(l.precioUnitario),
          subtotal:       dec(l.subtotal),
        })),
      },
    },
  })

  // Descontar stock + FIFO lotes + MovimientoStock por cada línea.
  for (const l of lineas) {
    const updated = await tx.producto.update({
      where: { id: l.productoId },
      data:  { stockTotal: { decrement: decQty(l.cantidad) } },
      select: { stockTotal: true },
    })
    const stockPosterior = Number(updated.stockTotal)
    const stockAnterior  = stockPosterior + l.cantidad

    // FIFO sobre lotes activos con stock
    const lotes = await tx.loteProducto.findMany({
      where: { productoId: l.productoId, activo: true, cantidadActual: { gt: 0 } },
      orderBy: [{ fechaVencimiento: { sort: "asc", nulls: "last" } }, { fechaIngreso: "asc" }],
    })
    let restante = l.cantidad
    for (const lote of lotes) {
      if (restante <= 0) break
      const disp = Number(lote.cantidadActual)
      const aTomar = Math.min(disp, restante)
      await tx.loteProducto.update({
        where: { id: lote.id },
        data: {
          cantidadActual: { decrement: decQty(aTomar) },
          ...(aTomar >= disp - 0.001 ? { activo: false } : {}),
        },
      })
      restante -= aTomar
    }

    await tx.movimientoStock.create({
      data: {
        productoId:     l.productoId,
        tipo:           "EGRESO_VENTA",
        cantidad:       decQty(l.cantidad),
        stockAnterior:  decQty(stockAnterior),
        stockPosterior: decQty(stockPosterior),
        usuarioId:      input.ctx.adminId,
        fecha:          input.fecha,
        origenTipo:     "venta",
        origenId:       venta.id,
      },
    })
  }

  // Actualizar cuenta + MovimientoCuenta (suma deuda en CC; en CONTADO también queda asentado).
  const cuentaActualizada = await tx.cuenta.update({
    where: { id: input.cuentaId },
    data:  { saldo: { increment: dec(total) } },
    select: { saldo: true },
  })
  const saldoPosterior = Number(cuentaActualizada.saldo)
  const saldoAnterior  = saldoPosterior - total
  await tx.movimientoCuenta.create({
    data: {
      cuentaId:       input.cuentaId,
      tipo:           "DEBE",
      monto:          dec(total),
      saldoAnterior:  dec(saldoAnterior),
      saldoPosterior: dec(saldoPosterior),
      descripcion:    `Venta #${venta.numero}`,
      fecha:          input.fecha,
      usuarioId:      input.ctx.adminId,
      origenTipo:     "venta",
      origenId:       venta.id,
    },
  })

  // Crear remito correlativo.
  const remitoNumero = formatearNumero(input.ctx.puntoVenta, input.ctx.proximoRemito)
  input.ctx.proximoRemito++
  const remito = await tx.remito.create({
    data: {
      numero:      remitoNumero,
      puntoVenta:  input.ctx.puntoVenta,
      fecha:       input.fecha,
      ventaId:     venta.id,
      estado:      "EMITIDO",
    },
  })
  void remito

  return { id: venta.id, numero: venta.numero, total, remitoNumero }
}

interface CrearCompraInput {
  ctx: ContextoOp
  proveedorId: string
  proveedorCondicionIva: "RESPONSABLE_INSCRIPTO" | "MONOTRIBUTO" | "EXENTO" | "CONSUMIDOR_FINAL" | "NO_RESPONSABLE"
  cuentaProveedorId: string
  condicion: "CONTADO" | "CUENTA_CORRIENTE"
  fecha: Date
  catalogo: CatalogoResult
  random: () => number
}

/** Crea una compra con 2-5 líneas. Cada línea genera un nuevo lote + MovimientoStock(INGRESO). */
async function crearCompra(
  tx: Prisma.TransactionClient,
  input: CrearCompraInput,
): Promise<{ id: string; total: number }> {
  const cantLineas = 2 + Math.floor(input.random() * 4) // 2-5
  const productosUsados = new Set<string>()
  const lineas: Array<{ productoId: string; unidadId: string; productoCodigo: string; cantidad: number; precioUnitario: number; subtotal: number; controlaVenc: boolean }> = []

  for (let i = 0; i < cantLineas; i++) {
    const pIdx = Math.floor(input.random() * PRODUCTOS.length)
    const p = PRODUCTOS[pIdx]
    if (productosUsados.has(p.codigo)) continue
    productosUsados.add(p.codigo)

    const productoId = input.catalogo.productoIdPorCodigo.get(p.codigo)!
    const unidadId   = input.catalogo.unidadIdPorAbrev.get(p.unidadAbrev)!
    const cantidad = 5 + Math.floor(input.random() * 20) // 5-24 unidades
    const precio = p.precioCompra
    lineas.push({ productoId, unidadId, productoCodigo: p.codigo, cantidad, precioUnitario: precio, subtotal: cantidad * precio, controlaVenc: p.controlaVencimiento })
  }

  const subtotal = lineas.reduce((acc, l) => acc + l.subtotal, 0)
  const iva = input.proveedorCondicionIva === "RESPONSABLE_INSCRIPTO" ? Math.round(subtotal * 0.21) : 0
  const total = subtotal + iva

  // Tipo de comprobante de compra según IVA del proveedor.
  const tipoComprobante = input.proveedorCondicionIva === "RESPONSABLE_INSCRIPTO" ? "FACTURA_A" : "FACTURA_C"

  const compra = await tx.compra.create({
    data: {
      tipoComprobante,
      puntoVenta:        input.ctx.puntoVenta,
      numeroComprobante: formatearNumero(input.ctx.puntoVenta, Math.floor(input.random() * 99999) + 1),
      fecha:             input.fecha,
      proveedorId:       input.proveedorId,
      condicion:         input.condicion,
      subtotal:          dec(subtotal),
      iva:               dec(iva),
      descuento:         dec(0),
      total:             dec(total),
      estado:            "RECIBIDA",
      creadaPorId:       input.ctx.adminId,
      detalles: {
        create: lineas.map((l) => ({
          productoId:     l.productoId,
          unidadId:       l.unidadId,
          cantidad:       decQty(l.cantidad),
          cantidadBase:   decQty(l.cantidad),
          precioUnitario: dec(l.precioUnitario),
          subtotal:       dec(l.subtotal),
        })),
      },
    },
  })

  // Cada línea genera ingreso de stock + nuevo lote (si controla vencimiento).
  for (const l of lineas) {
    const updated = await tx.producto.update({
      where: { id: l.productoId },
      data:  { stockTotal: { increment: decQty(l.cantidad) } },
      select: { stockTotal: true },
    })
    const stockPosterior = Number(updated.stockTotal)
    const stockAnterior  = stockPosterior - l.cantidad

    if (l.controlaVenc) {
      // Lote nuevo con vencimiento ~30-50 días desde la fecha de compra.
      const fechaVencimiento = new Date(input.fecha)
      fechaVencimiento.setDate(fechaVencimiento.getDate() + 30 + Math.floor(input.random() * 21))
      await tx.loteProducto.create({
        data: {
          productoId:       l.productoId,
          numeroLote:       `L-${l.productoCodigo}-C${compra.id.slice(-6)}`,
          fechaIngreso:     input.fecha,
          fechaVencimiento,
          cantidadInicial:  decQty(l.cantidad),
          cantidadActual:   decQty(l.cantidad),
          activo:           true,
          origenCompraId:   compra.id,
        },
      })
    }

    await tx.movimientoStock.create({
      data: {
        productoId:     l.productoId,
        tipo:           "INGRESO_COMPRA",
        cantidad:       decQty(l.cantidad),
        stockAnterior:  decQty(stockAnterior),
        stockPosterior: decQty(stockPosterior),
        usuarioId:      input.ctx.adminId,
        fecha:          input.fecha,
        origenTipo:     "compra",
        origenId:       compra.id,
      },
    })
  }

  // Movimiento en cuenta del proveedor — SOLO si la compra es CC.
  // En compras CONTADO se paga al toque (queda solo en MovimientoCaja),
  // sin impactar la CC del proveedor. Esto matchea src/server/actions/compras.ts.
  if (input.condicion === "CUENTA_CORRIENTE") {
    const cuentaActualizada = await tx.cuenta.update({
      where: { id: input.cuentaProveedorId },
      data:  { saldo: { increment: dec(total) } },
      select: { saldo: true },
    })
    const saldoPosterior = Number(cuentaActualizada.saldo)
    const saldoAnterior  = saldoPosterior - total
    await tx.movimientoCuenta.create({
      data: {
        cuentaId:       input.cuentaProveedorId,
        tipo:           "HABER",  // le debemos al proveedor (HABER en su cuenta = saldo a favor de él)
        monto:          dec(total),
        saldoAnterior:  dec(saldoAnterior),
        saldoPosterior: dec(saldoPosterior),
        descripcion:    `Compra CC #${compra.numeroComprobante ?? compra.id.slice(-6)}`,
        fecha:          input.fecha,
        usuarioId:      input.ctx.adminId,
        origenTipo:     "compra",
        origenId:       compra.id,
      },
    })
  }

  return { id: compra.id, total }
}

/** Cobra un % de la deuda más alta encontrada en CC clientes. Si no hay deuda, retorna null. */
async function registrarCobroOpcional(
  tx: Prisma.TransactionClient,
  input: {
    ctx: ContextoOp
    cajaId: string
    cuentaCCPorCliente: Map<string, string>
    fecha: Date
    random: () => number
  },
): Promise<{ monto: number } | null> {
  // Buscar cuentas CC con saldo > 0
  const cuentasIds = Array.from(input.cuentaCCPorCliente.values())
  const cuentasConSaldo = await tx.cuenta.findMany({
    where: { id: { in: cuentasIds }, saldo: { gt: 0 } },
    select: { id: true, saldo: true, clienteId: true, cliente: { select: { nombreRazonSocial: true } } },
  })
  if (cuentasConSaldo.length === 0) return null

  // Elegir una al azar
  const ctaIdx = Math.floor(input.random() * cuentasConSaldo.length)
  const cta = cuentasConSaldo[ctaIdx]
  const saldo = Number(cta.saldo)
  // Cobrar entre 30% y 100% del saldo
  const fraccion = 0.3 + input.random() * 0.7
  const monto = Math.max(1000, Math.round(saldo * fraccion))
  if (monto > saldo) return null

  // Actualizar cuenta (HABER: paga la deuda → saldo baja)
  const cuentaActualizada = await tx.cuenta.update({
    where: { id: cta.id },
    data:  { saldo: { decrement: dec(monto) } },
    select: { saldo: true },
  })
  const saldoPosterior = Number(cuentaActualizada.saldo)
  const saldoAnterior  = saldoPosterior + monto
  await tx.movimientoCuenta.create({
    data: {
      cuentaId:       cta.id,
      tipo:           "HABER",
      monto:          dec(monto),
      saldoAnterior:  dec(saldoAnterior),
      saldoPosterior: dec(saldoPosterior),
      descripcion:    `Cobro a ${cta.cliente?.nombreRazonSocial ?? "cliente"}`,
      fecha:          input.fecha,
      usuarioId:      input.ctx.adminId,
      origenTipo:     "cobro",
      origenId:       null,
    },
  })

  // Movimiento de caja: CC_HABER (entra efectivo por cobro)
  await tx.movimientoCaja.create({
    data: {
      cajaId:      input.cajaId,
      tipo:        "CC_HABER",
      categoria:   "COBRO_CLIENTE",
      monto:       dec(monto),
      descripcion: `Cobro a ${cta.cliente?.nombreRazonSocial ?? "cliente"}`,
      fecha:       input.fecha,
      usuarioId:   input.ctx.adminId,
      origenTipo:  "cobro",
      origenId:    null,
    },
  })

  return { monto }
}

/** Paga un % de lo adeudado a un proveedor al azar. Si no hay deudas, null. */
async function registrarPagoOpcional(
  tx: Prisma.TransactionClient,
  input: {
    ctx: ContextoOp
    cajaId: string
    cuentaProveedor: Map<string, string>
    fecha: Date
    random: () => number
  },
): Promise<{ monto: number } | null> {
  const cuentasIds = Array.from(input.cuentaProveedor.values())
  const cuentasConDeuda = await tx.cuenta.findMany({
    where: { id: { in: cuentasIds }, saldo: { gt: 0 } },
    select: { id: true, saldo: true, proveedorId: true, proveedor: { select: { nombreRazonSocial: true } } },
  })
  if (cuentasConDeuda.length === 0) return null

  const ctaIdx = Math.floor(input.random() * cuentasConDeuda.length)
  const cta = cuentasConDeuda[ctaIdx]
  const saldo = Number(cta.saldo)
  const fraccion = 0.4 + input.random() * 0.6
  const monto = Math.max(2000, Math.round(saldo * fraccion))
  if (monto > saldo) return null

  // Actualizar cuenta: DEBE (paga lo que les debemos → saldo a favor de ellos baja)
  const cuentaActualizada = await tx.cuenta.update({
    where: { id: cta.id },
    data:  { saldo: { decrement: dec(monto) } },
    select: { saldo: true },
  })
  const saldoPosterior = Number(cuentaActualizada.saldo)
  const saldoAnterior  = saldoPosterior + monto
  await tx.movimientoCuenta.create({
    data: {
      cuentaId:       cta.id,
      tipo:           "DEBE",
      monto:          dec(monto),
      saldoAnterior:  dec(saldoAnterior),
      saldoPosterior: dec(saldoPosterior),
      descripcion:    `Pago a ${cta.proveedor?.nombreRazonSocial ?? "proveedor"}`,
      fecha:          input.fecha,
      usuarioId:      input.ctx.adminId,
      origenTipo:     "pago",
      origenId:       null,
    },
  })

  // Caja: CC_DEBE (sale efectivo por pago a proveedor)
  await tx.movimientoCaja.create({
    data: {
      cajaId:      input.cajaId,
      tipo:        "CC_DEBE",
      categoria:   "PAGO_PROVEEDOR",
      monto:       dec(monto),
      descripcion: `Pago a ${cta.proveedor?.nombreRazonSocial ?? "proveedor"}`,
      fecha:       input.fecha,
      usuarioId:   input.ctx.adminId,
      origenTipo:  "pago",
      origenId:    null,
    },
  })

  return { monto }
}

interface CrearNotaInput {
  ctx: ContextoOp
  ventaId: string
  tipo: "CREDITO" | "DEBITO"
  fecha: Date
  motivo: string
  random: () => number
}

/** Crea una NC o ND contra una venta existente.
 *  NC: una línea con 50% de la primera línea de la venta. */
async function crearNota(tx: Prisma.TransactionClient, input: CrearNotaInput): Promise<void> {
  const venta = await tx.venta.findUnique({
    where:   { id: input.ventaId },
    include: { detalles: { take: 1 }, cliente: true },
  })
  if (!venta || venta.detalles.length === 0) return

  const det = venta.detalles[0]
  const cant = Math.max(1, Math.floor(Number(det.cantidad) * 0.5))
  const precioU = Number(det.precioUnitario)
  const subtotal = cant * precioU

  // Número de la nota: letra X + correlativo basado en proximoRemito + offset.
  const numero = formatearNumero(input.ctx.puntoVenta, input.ctx.proximoRemito + 1000)
  input.ctx.proximoRemito++

  const nota = await tx.notaCreditoDebito.create({
    data: {
      tipo:           input.tipo,
      letra:          "X",
      numero,
      puntoVenta:     input.ctx.puntoVenta,
      fecha:          input.fecha,
      ventaOrigenId:  input.ventaId,
      clienteId:      venta.clienteId,
      motivo:         input.motivo,
      montoTotal:     dec(subtotal),
      estado:         "EMITIDA",
      creadaPorId:    input.ctx.adminId,
      lineas: {
        create: [{
          productoId:     det.productoId,
          unidadId:       det.unidadId,
          cantidad:       decQty(cant),
          cantidadBase:   decQty(cant),
          precioUnitario: dec(precioU),
          subtotal:       dec(subtotal),
          generaMovimientoStock: input.tipo === "CREDITO",
        }],
      },
    },
  })

  // NC: devuelve stock + resta deuda CC del cliente.
  // ND: solo suma deuda CC al cliente.
  if (input.tipo === "CREDITO") {
    const updated = await tx.producto.update({
      where: { id: det.productoId },
      data:  { stockTotal: { increment: decQty(cant) } },
      select: { stockTotal: true },
    })
    const stockPosterior = Number(updated.stockTotal)
    const stockAnterior  = stockPosterior - cant

    await tx.movimientoStock.create({
      data: {
        productoId:     det.productoId,
        tipo:           "DEVOLUCION_CLIENTE",
        cantidad:       decQty(cant),
        stockAnterior:  decQty(stockAnterior),
        stockPosterior: decQty(stockPosterior),
        motivo:         `Nota de Crédito ${nota.numero}`,
        usuarioId:      input.ctx.adminId,
        fecha:          input.fecha,
        origenTipo:     "nota",
        origenId:       nota.id,
      },
    })

    // Restar deuda al cliente (movimiento HABER en su CC)
    const cuentaActualizada = await tx.cuenta.update({
      where: { id: venta.cuentaId },
      data:  { saldo: { decrement: dec(subtotal) } },
      select: { saldo: true },
    })
    const saldoPosterior = Number(cuentaActualizada.saldo)
    const saldoAnterior  = saldoPosterior + subtotal
    await tx.movimientoCuenta.create({
      data: {
        cuentaId:       venta.cuentaId,
        tipo:           "HABER",
        monto:          dec(subtotal),
        saldoAnterior:  dec(saldoAnterior),
        saldoPosterior: dec(saldoPosterior),
        descripcion:    `Nota de Crédito ${nota.numero}`,
        fecha:          input.fecha,
        usuarioId:      input.ctx.adminId,
        origenTipo:     "nota",
        origenId:       nota.id,
      },
    })
  } else {
    // ND: suma deuda CC al cliente.
    const cuentaActualizada = await tx.cuenta.update({
      where: { id: venta.cuentaId },
      data:  { saldo: { increment: dec(subtotal) } },
      select: { saldo: true },
    })
    const saldoPosterior = Number(cuentaActualizada.saldo)
    const saldoAnterior  = saldoPosterior - subtotal
    await tx.movimientoCuenta.create({
      data: {
        cuentaId:       venta.cuentaId,
        tipo:           "DEBE",
        monto:          dec(subtotal),
        saldoAnterior:  dec(saldoAnterior),
        saldoPosterior: dec(saldoPosterior),
        descripcion:    `Nota de Débito ${nota.numero}`,
        fecha:          input.fecha,
        usuarioId:      input.ctx.adminId,
        origenTipo:     "nota",
        origenId:       nota.id,
      },
    })
  }
}

/** Formato "PPPP-NNNNNNNN" (puntoVenta-numero zero-padded a 8). */
function formatearNumero(puntoVenta: number, numero: number): string {
  return `${String(puntoVenta).padStart(4, "0")}-${String(numero).padStart(8, "0")}`
}
