"use server"

import { prisma } from "@/lib/prisma"
import { differenceInDays, isPast, startOfMonth, subMonths } from "date-fns"

// ─────────────────────────────────────────────────────────────────────────────
// Tipos exportados para reportes de stock
// ─────────────────────────────────────────────────────────────────────────────

export type FilaStockDiario = {
  productoId: string
  codigo: string
  descripcion: string
  presentacion: string
  stockInicial: number
  // EGRESOS
  egresosVta: number
  egresosMerma: number
  egresosFaltante: number
  egresosSobra: number
  egresosOtros: number
  totalEgresos: number
  // INGRESOS
  ingresosCompra: number
  ingresosMerma: number
  ingresosFaltante: number
  ingresosSobrante: number
  ingresosOtro: number
  totalIngresos: number
  stockFinal: number
}

export type CajaParaReporte = {
  id: string
  numero: number
  fechaApertura: string
  fechaCierre: string | null
  estado: "ABIERTA" | "CERRADA"
  abiertaPorNombre: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Cajas para selector
// ─────────────────────────────────────────────────────────────────────────────

export async function obtenerCajasParaSelector(): Promise<CajaParaReporte[]> {
  const cajas = await prisma.cajaDiaria.findMany({
    orderBy: { numero: "desc" },
    take: 90,
    include: { abiertaPor: { select: { nombre: true } } },
  })
  return cajas.map((c) => ({
    id: c.id,
    numero: c.numero,
    fechaApertura: c.fechaApertura.toISOString(),
    fechaCierre: c.fechaCierre?.toISOString() ?? null,
    estado: c.estado as "ABIERTA" | "CERRADA",
    abiertaPorNombre: c.abiertaPor.nombre,
  }))
}

// ─────────────────────────────────────────────────────────────────────────────
// Reporte Diario de Stock
// ─────────────────────────────────────────────────────────────────────────────

export async function obtenerReporteStockDiario(cajaId?: string): Promise<{
  caja: CajaParaReporte
  filas: FilaStockDiario[]
} | null> {
  // 1. Buscar caja
  const cajaRaw = cajaId
    ? await prisma.cajaDiaria.findUnique({
        where: { id: cajaId },
        include: { abiertaPor: { select: { nombre: true } } },
      })
    : await prisma.cajaDiaria.findFirst({
        where: { estado: "ABIERTA" },
        orderBy: { numero: "desc" },
        include: { abiertaPor: { select: { nombre: true } } },
      }) ??
      await prisma.cajaDiaria.findFirst({
        where: { estado: "CERRADA" },
        orderBy: { numero: "desc" },
        include: { abiertaPor: { select: { nombre: true } } },
      })

  if (!cajaRaw) return null

  const caja: CajaParaReporte = {
    id: cajaRaw.id,
    numero: cajaRaw.numero,
    fechaApertura: cajaRaw.fechaApertura.toISOString(),
    fechaCierre: cajaRaw.fechaCierre?.toISOString() ?? null,
    estado: cajaRaw.estado as "ABIERTA" | "CERRADA",
    abiertaPorNombre: cajaRaw.abiertaPor.nombre,
  }

  const desde = cajaRaw.fechaApertura
  const hasta = cajaRaw.fechaCierre ?? new Date()

  // 2. Productos activos
  const productos = await prisma.producto.findMany({
    where: { activo: true, deletedAt: null },
    select: {
      id: true,
      codigo: true,
      nombre: true,
      stockTotal: true,
      unidadBase: { select: { abreviatura: true } },
    },
    orderBy: { nombre: "asc" },
  })

  // 3. Movimientos del período
  const movimientos = await prisma.movimientoStock.findMany({
    where: { fecha: { gte: desde, lte: hasta } },
    orderBy: { fecha: "asc" },
  })

  // 4. Agrupar movimientos por producto
  const movsByProducto = new Map<string, typeof movimientos>()
  for (const m of movimientos) {
    const lista = movsByProducto.get(m.productoId) ?? []
    lista.push(m)
    movsByProducto.set(m.productoId, lista)
  }

  // 5. Construir filas
  const filas: FilaStockDiario[] = productos.map((p) => {
    const movs = movsByProducto.get(p.id) ?? []
    const stockActual = Number(p.stockTotal)

    const stockInicial =
      movs.length > 0 ? Number(movs[0].stockAnterior) : stockActual
    const stockFinal =
      movs.length > 0
        ? Number(movs[movs.length - 1].stockPosterior)
        : stockActual

    const suma = (tipo: string) =>
      movs
        .filter((m) => m.tipo === tipo)
        .reduce((acc, m) => acc + Number(m.cantidad), 0)

    const egresosVta       = suma("EGRESO_VENTA")
    const egresosMerma     = suma("EGRESO_MERMA")
    const egresosFaltante  = suma("EGRESO_FALTANTE")
    const egresosSobra     = suma("AJUSTE_NEGATIVO")
    const egresosOtros     = suma("DEVOLUCION_PROVEEDOR")
    const ingresosCompra   = suma("INGRESO_COMPRA")
    const ingresosMerma    = 0
    const ingresosFaltante = 0
    const ingresosSobrante = suma("INGRESO_SOBRANTE")
    const ingresosOtro     = suma("AJUSTE_POSITIVO") + suma("DEVOLUCION_CLIENTE")

    return {
      productoId: p.id,
      codigo:       p.codigo,
      descripcion:  p.nombre,
      presentacion: p.unidadBase.abreviatura,
      stockInicial,
      egresosVta,
      egresosMerma,
      egresosFaltante,
      egresosSobra,
      egresosOtros,
      totalEgresos:  egresosVta + egresosMerma + egresosFaltante + egresosSobra + egresosOtros,
      ingresosCompra,
      ingresosMerma,
      ingresosFaltante,
      ingresosSobrante,
      ingresosOtro,
      totalIngresos: ingresosCompra + ingresosMerma + ingresosFaltante + ingresosSobrante + ingresosOtro,
      stockFinal,
    }
  })

  return { caja, filas }
}

// ─────────────────────────────────────────────────────────────────────────────
// Reporte Stock Resumido (versión condensada del diario)
// ─────────────────────────────────────────────────────────────────────────────

export type FilaStockResumido = {
  productoId:    string
  codigo:        string
  descripcion:   string
  presentacion:  string
  stockInicial:  number
  totalEgresos:  number
  totalIngresos: number
  stockFinal:    number
}

export async function obtenerReporteStockResumido(cajaId?: string): Promise<{
  caja:  CajaParaReporte
  filas: FilaStockResumido[]
} | null> {
  const diario = await obtenerReporteStockDiario(cajaId)
  if (!diario) return null

  const filas: FilaStockResumido[] = diario.filas.map((f) => ({
    productoId:   f.productoId,
    codigo:       f.codigo,
    descripcion:  f.descripcion,
    presentacion: f.presentacion,
    stockInicial: f.stockInicial,
    totalEgresos: f.totalEgresos,
    totalIngresos:f.totalIngresos,
    stockFinal:   f.stockFinal,
  }))

  return { caja: diario.caja, filas }
}

export async function obtenerResumenStock() {
  const productos = await prisma.producto.findMany({
    where: { activo: true, deletedAt: null },
    select: {
      id: true,
      nombre: true,
      codigo: true,
      stockTotal: true,
      stockMinimo: true,
      precioCompra: true,
      precioVenta: true,
      categoria: { select: { nombre: true } },
      unidadBase: { select: { abreviatura: true } },
    },
    orderBy: { nombre: "asc" },
  })

  const items = productos.map((p) => {
    const stock = Number(p.stockTotal)
    const minimo = Number(p.stockMinimo)
    const precioCompra = Number(p.precioCompra)
    const precioVenta = Number(p.precioVenta)
    return {
      id: p.id,
      nombre: p.nombre,
      codigo: p.codigo,
      categoria: p.categoria.nombre,
      unidad: p.unidadBase.abreviatura,
      stock,
      minimo,
      precioCompra,
      precioVenta,
      valorStock: stock * precioCompra,
      bajoMinimo: minimo > 0 && stock <= minimo,
      sinStock: stock === 0,
    }
  })

  const totalValorizado = items.reduce((acc, i) => acc + i.valorStock, 0)
  const totalProductos = items.length
  const productosConStock = items.filter((i) => i.stock > 0).length
  const productosBajoMinimo = items.filter((i) => i.bajoMinimo).length
  const productosSinStock = items.filter((i) => i.sinStock).length

  return { items, totalValorizado, totalProductos, productosConStock, productosBajoMinimo, productosSinStock }
}

export async function obtenerComprasPorMes(meses = 6) {
  const desde = startOfMonth(subMonths(new Date(), meses - 1))

  const compras = await prisma.compra.findMany({
    where: { estado: "RECIBIDA", fecha: { gte: desde } },
    select: {
      fecha: true,
      total: true,
      proveedorId: true,
    },
    orderBy: { fecha: "asc" },
  })

  const proveedoresMap = await prisma.proveedor.findMany({
    where: { id: { in: [...new Set(compras.map((c) => c.proveedorId))] } },
    select: { id: true, nombreRazonSocial: true },
  })

  // Agrupar por mes
  const porMes: Record<string, { label: string; total: number; cantidad: number }> = {}
  for (const c of compras) {
    const key = `${c.fecha.getFullYear()}-${String(c.fecha.getMonth() + 1).padStart(2, "0")}`
    if (!porMes[key]) {
      porMes[key] = {
        label: c.fecha.toLocaleDateString("es-AR", { month: "short", year: "numeric" }),
        total: 0,
        cantidad: 0,
      }
    }
    porMes[key].total += Number(c.total)
    porMes[key].cantidad++
  }

  // Agrupar por proveedor
  const porProveedor: Record<string, { nombre: string; total: number; cantidad: number }> = {}
  for (const c of compras) {
    const key = c.proveedorId
    if (!porProveedor[key]) {
      const nombre = proveedoresMap.find((p) => p.id === key)?.nombreRazonSocial ?? "Desconocido"
      porProveedor[key] = { nombre, total: 0, cantidad: 0 }
    }
    porProveedor[key].total += Number(c.total)
    porProveedor[key].cantidad++
  }

  const mesesData = Object.entries(porMes).map(([k, v]) => ({ key: k, ...v }))
  const proveedoresData = Object.values(porProveedor)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)

  const totalPeriodo = compras.reduce((acc, c) => acc + Number(c.total), 0)

  return { mesesData, proveedoresData, totalPeriodo, totalCompras: compras.length }
}

export async function obtenerReporteCaja(cajaId?: string) {
  const caja = cajaId
    ? await prisma.cajaDiaria.findUnique({ where: { id: cajaId } })
    : await prisma.cajaDiaria.findFirst({ where: { estado: "ABIERTA" }, orderBy: { fechaApertura: "desc" } })
        ?? await prisma.cajaDiaria.findFirst({ where: { estado: "CERRADA" }, orderBy: { fechaApertura: "desc" } })

  if (!caja) return null

  const movimientos = await prisma.movimientoCaja.findMany({
    where: { cajaId: caja.id, deletedAt: null },
    include: { usuario: { select: { nombre: true } } },
    orderBy: { fecha: "asc" },
  })

  const sumar = (tipo: string) =>
    movimientos.filter((m) => m.tipo === tipo).reduce((acc, m) => acc + Number(m.monto), 0)

  return {
    caja,
    movimientos: movimientos.map((m) => ({ ...m, monto: Number(m.monto) })),
    totalIngresos: sumar("CONTADO_HABER"),
    totalEgresos:  sumar("CONTADO_DEBE"),
    totalDebe:     sumar("CC_DEBE"),
    totalHaber:    sumar("CC_HABER"),
  }
}

export async function obtenerCajasList() {
  return prisma.cajaDiaria.findMany({
    orderBy: { fechaApertura: "desc" },
    take: 60,
    include: {
      abiertaPor: { select: { nombre: true } },
      cerradaPor: { select: { nombre: true } },
    },
  })
}

export async function obtenerMovimientosCuenta(cuentaId: string) {
  return prisma.movimientoCuenta.findMany({
    where: { cuentaId },
    include: { usuario: { select: { nombre: true } } },
    orderBy: { fecha: "desc" },
    take: 200,
  })
}

export async function obtenerCuentasConSaldo() {
  return prisma.cuenta.findMany({
    where: { deletedAt: null, activa: true },
    include: {
      cliente: { select: { id: true, nombreRazonSocial: true } },
      proveedor: { select: { id: true, nombreRazonSocial: true } },
    },
    orderBy: [{ titular: "asc" }, { saldo: "desc" }],
  })
}

export async function obtenerReporteClientes() {
  return prisma.cliente.findMany({
    where: { deletedAt: null },
    include: {
      cuentas: { where: { deletedAt: null }, select: { saldo: true, tipo: true } },
    },
    orderBy: { nombreRazonSocial: "asc" },
  })
}

export async function obtenerReporteProveedores() {
  return prisma.proveedor.findMany({
    where: { deletedAt: null },
    include: {
      cuentas: { where: { deletedAt: null }, select: { saldo: true, tipo: true } },
    },
    orderBy: { nombreRazonSocial: "asc" },
  })
}

export async function obtenerLotesCriticos() {
  const lotes = await prisma.loteProducto.findMany({
    where: { activo: true },
    select: {
      id: true,
      numeroLote: true,
      fechaVencimiento: true,
      cantidadActual: true,
      producto: {
        select: {
          nombre: true,
          unidadBase: { select: { abreviatura: true } },
        },
      },
    },
    orderBy: { fechaVencimiento: "asc" },
  })

  return lotes
    .filter((l) => {
      if (!l.fechaVencimiento) return false
      const dias = differenceInDays(l.fechaVencimiento, new Date())
      return dias <= 14 // próximos 14 días + vencidos
    })
    .map((l) => ({
      ...l,
      diasRestantes: differenceInDays(new Date(l.fechaVencimiento!), new Date()),
      vencido: isPast(new Date(l.fechaVencimiento!)),
      cantidadActual: Number(l.cantidadActual),
    }))
}
