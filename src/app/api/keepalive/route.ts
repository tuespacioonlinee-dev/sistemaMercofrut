import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Mantiene el compute de Neon despierto durante horario laboral.
// Se invoca desde Vercel Cron — ver vercel.json.
//
// El cron de Vercel envía un header x-vercel-cron, y opcionalmente Authorization
// con el CRON_SECRET. Aceptamos cualquiera de esas dos vías de autenticación
// para evitar wakeups arbitrarios desde internet.

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? ""
  const cronHeader = req.headers.get("x-vercel-cron")
  const ksecret = process.env.KEEPALIVE_SECRET ?? ""

  const autorizado =
    !!cronHeader ||
    (ksecret && auth === `Bearer ${ksecret}`)

  if (!autorizado) {
    return NextResponse.json({ ok: false, error: "no auth" }, { status: 401 })
  }

  // Query trivial: despierta el compute si estaba suspendido
  const result = await prisma.$queryRaw<{ ok: number }[]>`SELECT 1 as ok`
  return NextResponse.json({ ok: true, db: result[0]?.ok === 1, ts: new Date().toISOString() })
}
