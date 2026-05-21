"use client"

import { useLiveQuery } from "dexie-react-hooks"
import { getOfflineDB, type VentaOffline } from "@/lib/offline-db"
import { OFFLINE_MODE_ENABLED } from "@/lib/feature-flags"

/**
 * Devuelve la lista de ventas offline filtradas por estado.
 * Garantiza `VentaOffline[]` siempre (nunca undefined).
 */
export function useVentasOffline(estado?: VentaOffline["estado"]): VentaOffline[] {
  const r = useLiveQuery(
    async (): Promise<VentaOffline[]> => {
      if (!OFFLINE_MODE_ENABLED) return []
      const db = getOfflineDB()
      if (estado) return db.ventasOffline.where("estado").equals(estado).toArray()
      return db.ventasOffline.toArray()
    },
    [estado],
  )
  return r ?? []
}

/** Cuenta de ventas en estado PENDIENTE_SYNC — para badge de banner. */
export function useVentasPendientesCount(): number {
  const r = useLiveQuery(
    async (): Promise<number> => {
      if (!OFFLINE_MODE_ENABLED) return 0
      return getOfflineDB().ventasOffline.where("estado").equals("PENDIENTE_SYNC").count()
    },
    [],
  )
  return r ?? 0
}
