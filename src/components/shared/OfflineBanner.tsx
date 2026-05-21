"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { CloudOff, CloudCheck, Lock } from "lucide-react"
import { OFFLINE_MODE_ENABLED } from "@/lib/feature-flags"
import { useConnectivity } from "@/hooks/useConnectivity"
import { getFingerprint } from "@/lib/offline-fingerprint"
import { cn } from "@/lib/utils"

interface LockStatus {
  otrosDispositivosOffline: boolean
  dispositivos: Array<{ nombre: string | null; ultimoHeartbeat: string; ventasOfflinePendientes: number }>
}

/**
 * Banner persistente que comunica el estado de conectividad y notas pendientes.
 *
 * Reglas (recordá: si OFFLINE_MODE_ENABLED=false, retorna null SIN tocar nada):
 *  - Flag OFF → null (sistema sin cambios)
 *  - Flag ON + offline → banner naranja con CTA a /ventas/nueva
 *  - Flag ON + online + lock de otro dispositivo → banner gris con info
 *  - Flag ON + online + sin pendientes → null
 *
 * El contador de "pendientes" para banner verde (post-recovery) lo hace
 * el componente OfflinePendingBanner una vez que tenemos Dexie en F4.
 */
export function OfflineBanner() {
  // Early return COMPLETO si el flag está apagado, sin invocar hooks ni nada.
  if (!OFFLINE_MODE_ENABLED) return null

  return <OfflineBannerInner />
}

function OfflineBannerInner() {
  const { online } = useConnectivity()
  const [lockStatus, setLockStatus] = useState<LockStatus>({
    otrosDispositivosOffline: false,
    dispositivos: [],
  })

  // Chequeo del lock multi-dispositivo cada minuto cuando estamos online.
  useEffect(() => {
    if (!online) return
    const fingerprint = getFingerprint()
    if (!fingerprint) return

    let cancelado = false
    const cargar = async () => {
      try {
        const res = await fetch(`/api/offline/lock-status?fingerprint=${encodeURIComponent(fingerprint)}`, {
          cache: "no-store",
        })
        if (cancelado) return
        if (res.ok) {
          const data = (await res.json()) as LockStatus
          setLockStatus(data)
        }
      } catch {
        /* silencioso — el banner queda en último valor conocido */
      }
    }

    void cargar()
    const id = setInterval(cargar, 60_000)
    return () => { cancelado = true; clearInterval(id) }
  }, [online])

  if (!online) {
    return (
      <div className={cn(
        "w-full px-4 py-2 flex items-center justify-between gap-3 text-sm",
        "bg-amber-500 text-white shadow-md",
      )}>
        <div className="flex items-center gap-2 min-w-0">
          <CloudOff className="h-4 w-4 shrink-0" />
          <span className="font-medium truncate">
            Modo offline activo. Solo podés cargar ventas. Los demás módulos están bloqueados hasta volver online.
          </span>
        </div>
        <Link
          href="/ventas/nueva"
          className="px-3 py-1 rounded bg-white/20 hover:bg-white/30 text-white text-xs font-semibold whitespace-nowrap"
        >
          Cargar venta →
        </Link>
      </div>
    )
  }

  if (lockStatus.otrosDispositivosOffline) {
    return (
      <div className={cn(
        "w-full px-4 py-2 flex items-center gap-2 text-sm",
        "bg-slate-700 text-white shadow-md",
      )}>
        <Lock className="h-4 w-4 shrink-0" />
        <span className="font-medium">
          {lockStatus.dispositivos.length === 1
            ? "Otro dispositivo está en modo offline."
            : `${lockStatus.dispositivos.length} dispositivos están en modo offline.`}
          {" "}No podés cargar ventas hasta que sincronicen o se reconecten.
        </span>
      </div>
    )
  }

  // Online + sin lock + sin pendientes (post-recovery se renderiza en F4 con Dexie)
  return null
}

/**
 * Mini variante que solo se muestra cuando hay ventas pendientes en Dexie
 * tras recuperar conexión. Se renderiza en F4-F6 cuando ya tenemos Dexie.
 * Mantengo el placeholder aquí para que la API quede estable.
 */
export function OfflineRecoveryBanner({ pendientes }: { pendientes: number }) {
  if (!OFFLINE_MODE_ENABLED) return null
  if (pendientes === 0) return null
  return (
    <div className={cn(
      "w-full px-4 py-2 flex items-center justify-between gap-3 text-sm",
      "bg-emerald-600 text-white shadow-md",
    )}>
      <div className="flex items-center gap-2 min-w-0">
        <CloudCheck className="h-4 w-4 shrink-0" />
        <span className="font-medium truncate">
          Conexión recuperada. {pendientes} venta{pendientes !== 1 ? "s" : ""} pendiente{pendientes !== 1 ? "s" : ""} de sincronizar.
        </span>
      </div>
      <Link
        href="/ventas/sincronizar"
        className="px-3 py-1 rounded bg-white/20 hover:bg-white/30 text-white text-xs font-semibold whitespace-nowrap"
      >
        Sincronizar →
      </Link>
    </div>
  )
}
