"use client"

import { useLiveQuery } from "dexie-react-hooks"
import { getOfflineDB, type VentaOffline } from "@/lib/offline-db"
import { OFFLINE_MODE_ENABLED } from "@/lib/feature-flags"

/**
 * Devuelve la lista de ventas offline filtradas por estado.
 * Si flag OFF → array vacío estable, sin tocar IndexedDB.
 */
export function useVentasOffline(estado?: VentaOffline["estado"]) {
  return useLiveQuery<VentaOffline[]>(
    async () => {
      if (!OFFLINE_MODE_ENABLED) return []
      const db = getOfflineDB()
      if (estado) return db.ventasOffline.where("estado").equals(estado).toArray()
      return db.ventasOffline.toArray()
    },
    [estado],
    [],
  )
}

/** Cuenta de ventas en estado PENDIENTE_SYNC — para badge de banner. */
export function useVentasPendientesCount(): number {
  return useLiveQuery<number>(
    async () => {
      if (!OFFLINE_MODE_ENABLED) return 0
      return getOfflineDB().ventasOffline.where("estado").equals("PENDIENTE_SYNC").count()
    },
    [],
    0,
  ) ?? 0
}
