import "server-only"
import { prisma } from "@/lib/prisma"

/**
 * Resuelve el precio que aplica a un producto para un cliente puntual.
 *
 * Orden de resolución:
 *   1. Si el cliente tiene `listaPrecioId` y la lista está activa,
 *      y hay un `PrecioProducto` para ese producto en esa lista → ese precio.
 *   2. Si existe una lista marcada como `esDefault: true` activa y tiene
 *      precio para ese producto → ese precio.
 *   3. Fallback: `producto.precioVenta` (precio base, compatibilidad).
 */
export async function getPrecioParaCliente(
  productoId: string,
  clienteId: string | null,
): Promise<number> {
  // 1. Lista del cliente
  if (clienteId) {
    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId },
      select: { listaPrecioId: true },
    })
    if (cliente?.listaPrecioId) {
      const precio = await prisma.precioProducto.findUnique({
        where: {
          productoId_listaPrecioId: {
            productoId,
            listaPrecioId: cliente.listaPrecioId,
          },
        },
        select: { precio: true, listaPrecio: { select: { activa: true } } },
      })
      if (precio && precio.listaPrecio.activa) {
        return Number(precio.precio)
      }
    }
  }

  // 2. Lista default
  const listaDefault = await prisma.listaPrecio.findFirst({
    where: { esDefault: true, activa: true, deletedAt: null },
    select: { id: true },
  })
  if (listaDefault) {
    const precio = await prisma.precioProducto.findUnique({
      where: {
        productoId_listaPrecioId: {
          productoId,
          listaPrecioId: listaDefault.id,
        },
      },
      select: { precio: true },
    })
    if (precio) return Number(precio.precio)
  }

  // 3. Fallback al precio base
  const producto = await prisma.producto.findUnique({
    where:  { id: productoId },
    select: { precioVenta: true },
  })
  return producto ? Number(producto.precioVenta) : 0
}

/**
 * Versión batch: devuelve un Map<productoId, precio> para varios productos.
 * Útil para autocompletar precios en formularios de venta sin N+1 queries.
 */
export async function getPreciosParaCliente(
  productoIds: string[],
  clienteId: string | null,
): Promise<Map<string, number>> {
  if (productoIds.length === 0) return new Map()

  const out = new Map<string, number>()

  // Traigo todos los productos para fallback
  const productos = await prisma.producto.findMany({
    where:  { id: { in: productoIds } },
    select: { id: true, precioVenta: true },
  })
  for (const p of productos) out.set(p.id, Number(p.precioVenta))

  // Detectar lista a aplicar
  let listaPrecioId: string | null = null
  if (clienteId) {
    const cliente = await prisma.cliente.findUnique({
      where:  { id: clienteId },
      select: { listaPrecioId: true, listaPrecio: { select: { activa: true } } },
    })
    if (cliente?.listaPrecioId && cliente.listaPrecio?.activa) {
      listaPrecioId = cliente.listaPrecioId
    }
  }
  if (!listaPrecioId) {
    const listaDefault = await prisma.listaPrecio.findFirst({
      where:  { esDefault: true, activa: true, deletedAt: null },
      select: { id: true },
    })
    listaPrecioId = listaDefault?.id ?? null
  }

  // Si hay lista, override los precios que existan
  if (listaPrecioId) {
    const precios = await prisma.precioProducto.findMany({
      where:  { productoId: { in: productoIds }, listaPrecioId },
      select: { productoId: true, precio: true },
    })
    for (const p of precios) out.set(p.productoId, Number(p.precio))
  }

  return out
}
