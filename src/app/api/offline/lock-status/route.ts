/**
 * GET /api/offline/lock-status?fingerprint=...
 *
 * Devuelve si otros dispositivos del mismo negocio están en modo offline.
 * Usado por el banner gris de lock multi-dispositivo.
 */
import { NextResponse } from "next/server"
import { OFFLINE_MODE_ENABLED } from "@/lib/feature-flags"
import { obtenerEstadoLockMultiDispositivo } from "@/server/actions/offline"
import { AuthorizationError } from "@/lib/auth-guards"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(req: Request) {
  if (!OFFLINE_MODE_ENABLED) {
    return NextResponse.json({ otrosDispositivosOffline: false, dispositivos: [] })
  }

  const url = new URL(req.url)
  const fingerprint = url.searchParams.get("fingerprint")
  if (!fingerprint) {
    return NextResponse.json({ error: "fingerprint requerido" }, { status: 400 })
  }

  try {
    const r = await obtenerEstadoLockMultiDispositivo(fingerprint)
    return NextResponse.json(r)
  } catch (e) {
    if (e instanceof AuthorizationError) {
      return NextResponse.json({ error: e.message }, { status: 401 })
    }
    const msg = e instanceof Error ? e.message : "Error interno"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
