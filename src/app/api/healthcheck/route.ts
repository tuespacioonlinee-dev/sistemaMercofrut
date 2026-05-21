/**
 * Endpoint de healthcheck para que el cliente detecte conectividad real.
 *
 * Devuelve 200 + JSON si el server responde. El cliente lo usa cada 30s
 * en combinación con navigator.onLine para discernir online verdadero
 * de "tengo wifi pero no llego al server".
 *
 * Sin auth — debe responder rápido incluso a usuarios deslogueados, así
 * el flujo de connectivity check no se acopla a auth.
 */
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
  })
}
