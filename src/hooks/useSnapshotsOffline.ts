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
  return useLiveQuery<ClienteSnap[]>(
    async () => {
      if (!OFFLINE_MODE_ENABLED) return []
      return getOfflineDB().clientes.orderBy("nombreRazonSocial").toArray()
    },
    [],
    [],
  ) ?? []
}

export function useSnapshotProductos(): ProductoSnap[] {
  return useLiveQuery<ProductoSnap[]>(
    async () => {
      if (!OFFLINE_MODE_ENABLED) return []
      return getOfflineDB().productos.orderBy("nombre").toArray()
    },
    [],
    [],
  ) ?? []
}

export function useSnapshotParametros(): ParametrosSnap | null {
  return useLiveQuery<ParametrosSnap | null>(
    async () => {
      if (!OFFLINE_MODE_ENABLED) return null
      const p = await getOfflineDB().parametros.get("parametros")
      return p ?? null
    },
    [],
    null,
  ) ?? null
}
