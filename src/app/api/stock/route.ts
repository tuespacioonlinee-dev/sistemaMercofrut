import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/stock
 * Devuelve un mapa { [productoId]: stockTotal } con todos los productos activos.
 * Usado por FormVenta para verificar stock en tiempo real sin recargar la página.
 */
export async function GET() {
  const productos = await prisma.producto.findMany({
    where: { activo: true, deletedAt: null },
    select: { id: true, stockTotal: true },
  })

  const stockMap: Record<string, number> = {}
  for (const p of productos) {
    stockMap[p.id] = Number(p.stockTotal)
  }

  return NextResponse.json(stockMap, {
    headers: {
      // No cachear: siempre queremos el stock actual
      "Cache-Control": "no-store",
    },
  })
}
