"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { OFFLINE_MODE_ENABLED } from "@/lib/feature-flags"

const PING_INTERVAL_MS = 30_000
const PING_TIMEOUT_MS = 5_000

export interface ConnectivityState {
  online: boolean
  lastCheck: Date | null
  forceCheck: () => Promise<void>
}

/**
 * Hook que devuelve el estado real de conectividad combinando navigator.onLine
 * con un ping a /api/healthcheck cada 30s.
 *
 * Si OFFLINE_MODE_ENABLED=false el hook siempre devuelve { online: true }
 * sin hacer ping. Cero overhead cuando el flag está apagado.
 */
export function useConnectivity(): ConnectivityState {
  const [online, setOnline] = useState<boolean>(() => {
    if (!OFFLINE_MODE_ENABLED) return true
    if (typeof navigator === "undefined") return true
    return navigator.onLine
  })
  const [lastCheck, setLastCheck] = useState<Date | null>(null)
  const inFlightRef = useRef<boolean>(false)

  const check = useCallback(async (): Promise<void> => {
    if (!OFFLINE_MODE_ENABLED) return
    if (inFlightRef.current) return
    inFlightRef.current = true
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), PING_TIMEOUT_MS)
      try {
        const res = await fetch("/api/healthcheck", {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        })
        setOnline(res.ok)
      } catch {
        setOnline(false)
      } finally {
        clearTimeout(timer)
      }
      setLastCheck(new Date())
    } finally {
      inFlightRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!OFFLINE_MODE_ENABLED) return

    // Chequeo inicial
    void check()

    // Polling cada 30s mientras la pestaña esté activa
    const id = setInterval(() => {
      if (document.visibilityState === "visible") {
        void check()
      }
    }, PING_INTERVAL_MS)

    // Eventos del navegador para re-check inmediato
    const onOnline = () => void check()
    const onOffline = () => setOnline(false)
    const onVisible = () => {
      if (document.visibilityState === "visible") void check()
    }

    window.addEventListener("online", onOnline)
    window.addEventListener("offline", onOffline)
    document.addEventListener("visibilitychange", onVisible)

    return () => {
      clearInterval(id)
      window.removeEventListener("online", onOnline)
      window.removeEventListener("offline", onOffline)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [check])

  return { online, lastCheck, forceCheck: check }
}
