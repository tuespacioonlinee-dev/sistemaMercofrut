/**
 * GET /api/snapshot/clientes
 *
 * Devuelve un snapshot de los clientes activos para uso offline.
 * Proyección mínima: solo lo que el form de venta necesita.
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

  const clientes = await prisma.cliente.findMany({
    where: { deletedAt: null, activo: true },
    select: { id: true, nombreRazonSocial: true, documento: true },
    orderBy: { nombreRazonSocial: "asc" },
  })

  return NextResponse.json({
    clientes,
    ultimaActualizacion: new Date().toISOString(),
  })
}
