"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { CloudOff } from "lucide-react"
import { OFFLINE_MODE_ENABLED } from "@/lib/feature-flags"
import { useConnectivity } from "@/hooks/useConnectivity"
import { Button } from "@/components/ui/button"

interface Props {
  children: React.ReactNode
  /** Texto opcional explicando por qué este módulo no funciona offline. */
  motivo?: string
}

/**
 * Wrapper para envolver rutas/pantallas que NO funcionan offline.
 *
 * Reglas:
 *  - Flag OFF → renderiza children sin tocar nada (cero overhead)
 *  - Flag ON + online → renderiza children
 *  - Flag ON + offline → pantalla bloqueante con CTA a /ventas/nueva
 *
 * Lo usamos en cobros, caja, cuentas, reportes, notas, etc.
 */
export function OfflineGuard({ children, motivo }: Props) {
  // Early return total con flag off — ni siquiera importamos useConnectivity.
  if (!OFFLINE_MODE_ENABLED) {
    return <>{children}</>
  }
  return <OfflineGuardInner motivo={motivo}>{children}</OfflineGuardInner>
}

function OfflineGuardInner({ children, motivo }: Props) {
  // SSR-safe: mientras `mounted` es false (SSR + primer client render),
  // renderizamos children como si fuera online. Recién en useEffect (post-mount)
  // evaluamos connectivity real. Evita hydration mismatch.
  const [mounted, setMounted] = useState(false)
  const { online } = useConnectivity()

  useEffect(() => { setMounted(true) }, [])

  // Pre-mount o connectivity todavía desconocida → mostrar children
  // (no bloquear UI optimistamente; si después detectamos offline, re-render).
  if (!mounted) return <>{children}</>
  if (online !== false) return <>{children}</>

  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center max-w-md mx-auto">
      <div className="rounded-full p-4 bg-amber-100 mb-4">
        <CloudOff className="h-8 w-8 text-amber-600" />
      </div>
      <h2 className="text-xl font-semibold mb-2">Este módulo no funciona offline</h2>
      <p className="text-sm text-muted-foreground mb-6">
        {motivo ?? "Esta operación requiere conexión a internet porque necesita validar datos contra el servidor."}
        {" "}En modo offline solo podés cargar ventas; el resto se desbloquea al recuperar conexión.
      </p>
      <Link href="/ventas/nueva">
        <Button>Ir a cargar venta</Button>
      </Link>
    </div>
  )
}
