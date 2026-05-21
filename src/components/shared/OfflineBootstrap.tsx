"use client"

import { useEffect } from "react"
import { OFFLINE_MODE_ENABLED } from "@/lib/feature-flags"

/**
 * Bootstrap del sync background del modo offline.
 *
 * Se monta una sola vez en el dashboard layout. Si OFFLINE_MODE_ENABLED=false,
 * no hace NADA (ni siquiera importa offline-sync, gracias al dynamic import).
 *
 * Cuando el flag está activo, arranca los timers de heartbeat, snapshot
 * refresh y aseguramiento de reservas.
 */
export function OfflineBootstrap() {
  useEffect(() => {
    if (!OFFLINE_MODE_ENABLED) return

    let cleanup: (() => void) | undefined

    // Dynamic import: solo carga el módulo si el flag está activo.
    // Esto garantiza cero impacto en bundle cuando el flag está apagado
    // (los chunks de offline-sync no se descargan).
    void import("@/lib/offline-sync").then(({ iniciarSyncBackground }) => {
      cleanup = iniciarSyncBackground()
    })

    return () => { cleanup?.() }
  }, [])

  return null
}
