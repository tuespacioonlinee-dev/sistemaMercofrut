"use client"

import { useCallback } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { getOfflineDB, type ReservaLocal } from "@/lib/offline-db"
import { OFFLINE_MODE_ENABLED } from "@/lib/feature-flags"

/**
 * Devuelve las reservas no consumidas y no expiradas.
 */
export function useReservasDisponibles(): ReservaLocal[] {
  return useLiveQuery<ReservaLocal[]>(
    async () => {
      if (!OFFLINE_MODE_ENABLED) return []
      const ahora = new Date().toISOString()
      return getOfflineDB().reservas
        .filter((r) => !r.consumida && r.expiraEn > ahora)
        .toArray()
    },
    [],
    [],
  ) ?? []
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
    return db.transaction("rw", db.reservas, async () => {
      const candidatos = await db.reservas
        .filter((r) => !r.consumida && r.expiraEn > ahora)
        .toArray()
      if (candidatos.length === 0) return null
      // Ordenar por numeroValor para usar siempre el más bajo primero
      candidatos.sort((a, b) => a.numeroValor - b.numeroValor)
      const elegido = candidatos[0]
      await db.reservas.update(elegido.numeroFormateado, { consumida: true })
      return { ...elegido, consumida: true }
    })
  }, [])
}
