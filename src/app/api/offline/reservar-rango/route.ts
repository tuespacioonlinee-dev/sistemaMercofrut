/**
 * POST /api/offline/reservar-rango
 *
 * Wrapper HTTP de la server action reservarRangoOffline. Lo usa el
 * background sync para asegurar siempre N reservas disponibles.
 */
import { NextResponse } from "next/server"
import { OFFLINE_MODE_ENABLED } from "@/lib/feature-flags"
import { reservarRangoOffline } from "@/server/actions/offline"
import { AuthorizationError } from "@/lib/auth-guards"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(req: Request) {
  if (!OFFLINE_MODE_ENABLED) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  try {
    const r = await reservarRangoOffline(body)
    if ("error" in r) {
      return NextResponse.json({ error: r.error }, { status: 400 })
    }
    return NextResponse.json(r)
  } catch (e) {
    if (e instanceof AuthorizationError) {
      return NextResponse.json({ error: e.message }, { status: 401 })
    }
    const msg = e instanceof Error ? e.message : "Error interno"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
