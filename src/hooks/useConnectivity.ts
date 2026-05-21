"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { OFFLINE_MODE_ENABLED } from "@/lib/feature-flags"

const PING_INTERVAL_MS = 30_000
const PING_TIMEOUT_MS = 5_000

export interface ConnectivityState {
  /**
   * `null` durante el primer render (SSR-safe). Después del mount client-only
   * es boolean. Consumidores deberían tratar `null` como "todavía no sabemos"
   * y NO mostrar UI dependiente del estado hasta que sea boolean.
   *
   * Si OFFLINE_MODE_ENABLED=false, siempre `true` desde el primer render.
   */
  online: boolean | null
  lastCheck: Date | null
  forceCheck: () => Promise<void>
}

/**
 * Hook SSR-safe que devuelve el estado real de conectividad.
 *
 * Estrategia anti-hydration-mismatch: cuando OFFLINE_MODE_ENABLED=true,
 * el estado inicial es `null` (tanto en server como en client primer render).
 * En el useEffect (client-only post-mount) se setea el valor real desde
 * navigator.onLine + ping a /api/healthcheck.
 *
 * Si OFFLINE_MODE_ENABLED=false, devuelve siempre `{ online: true }` sin
 * polling. Cero overhead cuando el flag está apagado.
 */
export function useConnectivity(): ConnectivityState {
  // Estado inicial determinístico entre server y client → evita hydration mismatch.
  // Flag ON: arrancamos en `null` (estado "desconocido") y se resuelve en useEffect.
  // Flag OFF: arrancamos en `true` siempre.
  const [online, setOnline] = useState<boolean | null>(
    OFFLINE_MODE_ENABLED ? null : true,
  )
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

    // Estado inicial real desde navigator.onLine — solo después de mount
    // (ya pasamos hydration, no hay mismatch).
    if (typeof navigator !== "undefined") {
      setOnline(navigator.onLine)
    }

    // Primer chequeo contra el server.
    void check()

    const id = setInterval(() => {
      if (document.visibilityState === "visible") {
        void check()
      }
    }, PING_INTERVAL_MS)

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
