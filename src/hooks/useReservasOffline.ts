"use client"

import { useCallback } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { getOfflineDB, type ReservaLocal } from "@/lib/offline-db"
import { OFFLINE_MODE_ENABLED } from "@/lib/feature-flags"

/**
 * Devuelve las reservas no consumidas y no expiradas.
 * Garantiza `ReservaLocal[]` siempre (nunca undefined).
 */
export function useReservasDisponibles(): ReservaLocal[] {
  const r = useLiveQuery(
    async (): Promise<ReservaLocal[]> => {
      if (!OFFLINE_MODE_ENABLED) return []
      const ahora = new Date().toISOString()
      return getOfflineDB().reservas
        .filter((x) => !x.consumida && x.expiraEn > ahora)
        .toArray()
    },
    [],
  )
  return r ?? []
}

/**
 * Toma la primera reserva disponible y la marca como consumida.
 * Devuelve null si no hay reservas.
 */
export function useTomarReserva() {
  return useCallback(async (): Promise<ReservaLocal | null> => {
    if (!OFFLINE_MODE_ENABLED) return null
    const db = getOfflineDB()
    const ahora = new Date().toISOString()
    const resultado = await db.transaction("rw", db.reservas, async () => {
      const candidatos = await db.reservas
        .filter((r) => !r.consumida && r.expiraEn > ahora)
        .toArray()
      if (candidatos.length === 0) return null
      candidatos.sort((a, b) => a.numeroValor - b.numeroValor)
      const elegido = candidatos[0]
      await db.reservas.update(elegido.numeroFormateado, { consumida: true })
      return { ...elegido, consumida: true }
    })
    return resultado
  }, [])
}
