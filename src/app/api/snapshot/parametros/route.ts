/**
 * GET /api/snapshot/parametros
 *
 * Snapshot mínimo de parámetros del negocio que el cliente offline necesita
 * (sobre todo, el punto de venta default para mostrarlo en el remito).
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

  const [params, negocio] = await Promise.all([
    prisma.parametrosComprobante.findFirst({ select: { puntoVenta: true } }),
    prisma.parametrosNegocio.findFirst({ select: { nombreFantasia: true } }),
  ])

  return NextResponse.json({
    puntoVenta:     params?.puntoVenta ?? 1,
    nombreFantasia: negocio?.nombreFantasia ?? "Mercofrut",
    ultimaActualizacion: new Date().toISOString(),
  })
}
