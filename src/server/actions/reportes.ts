"use server"

import { prisma } from "@/lib/prisma"
import { differenceInDays, isPast, startOfMonth, endOfMonth, subMonths } from "date-fns"

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
