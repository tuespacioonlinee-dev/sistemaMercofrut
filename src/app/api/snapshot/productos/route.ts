/**
 * GET /api/snapshot/productos
 *
 * Devuelve productos activos con stockAproximado y unidad base.
 * El stock es "aproximado" — al momento del snapshot, no en tiempo real.
 */
import { NextResponse } from "next/server"
import { OFFLINE_MODE_ENABLED } from "@/lib/feature-flags"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/auth-guards"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  if (!OFFLINE_MODE_ENABLED) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  try {
    await requireSession()
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const productos = await prisma.producto.findMany({
    where: { deletedAt: null, activo: true },
    select: {
      id:           true,
      codigo:       true,
      nombre:       true,
      precioVenta:  true,
      stockTotal:   true,
      unidadBase:   { select: { id: true, abreviatura: true } },
    },
    orderBy: { nombre: "asc" },
  })

  // Convertir Decimal a number para serializar limpio.
  const serializados = productos.map((p) => ({
    id:              p.id,
    codigo:          p.codigo,
    nombre:          p.nombre,
    precioVenta:     Number(p.precioVenta),
    stockAproximado: Number(p.stockTotal),
    unidadBaseId:    p.unidadBase.id,
    unidadBaseAbrev: p.unidadBase.abreviatura,
  }))

  return NextResponse.json({
    productos: serializados,
    ultimaActualizacion: new Date().toISOString(),
  })
}
