"use client"

import { useLiveQuery } from "dexie-react-hooks"
import {
  getOfflineDB,
  type ClienteSnap,
  type ProductoSnap,
  type ParametrosSnap,
} from "@/lib/offline-db"
import { OFFLINE_MODE_ENABLED } from "@/lib/feature-flags"

export function useSnapshotClientes(): ClienteSnap[] {
  const r = useLiveQuery(
    async (): Promise<ClienteSnap[]> => {
      if (!OFFLINE_MODE_ENABLED) return []
      return getOfflineDB().clientes.orderBy("nombreRazonSocial").toArray()
    },
    [],
  )
  return r ?? []
}

export function useSnapshotProductos(): ProductoSnap[] {
  const r = useLiveQuery(
    async (): Promise<ProductoSnap[]> => {
      if (!OFFLINE_MODE_ENABLED) return []
      return getOfflineDB().productos.orderBy("nombre").toArray()
    },
    [],
  )
  return r ?? []
}

export function useSnapshotParametros(): ParametrosSnap | null {
  const r = useLiveQuery(
    async (): Promise<ParametrosSnap | null> => {
      if (!OFFLINE_MODE_ENABLED) return null
      const p = await getOfflineDB().parametros.get("parametros")
      return p ?? null
    },
    [],
  )
  return r ?? null
}
