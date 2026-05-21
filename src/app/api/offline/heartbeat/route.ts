/**
 * POST /api/offline/heartbeat
 *
 * Recibe { fingerprint, nombre?, estado? } y delega a la server action
 * `heartbeat`. Si OFFLINE_MODE_ENABLED=false, responde 404.
 *
 * Endpoint expuesto para que el cliente pueda hacer heartbeat desde un
 * setInterval (las server actions de Next.js no son trivialmente
 * llamables desde JS plano sin pasar por la integración de React).
 */
import { NextResponse } from "next/server"
import { OFFLINE_MODE_ENABLED } from "@/lib/feature-flags"
import { heartbeat } from "@/server/actions/offline"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(req: Request) {
  if (!OFFLINE_MODE_ENABLED) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const r = await heartbeat(body)
  if ("error" in r) {
    return NextResponse.json({ error: r.error }, { status: 400 })
  }
  return NextResponse.json(r)
}
