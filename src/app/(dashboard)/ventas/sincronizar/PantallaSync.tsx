"use client"

import { useState } from "react"
import { toast } from "sonner"
import { CheckCircle2, AlertTriangle, Clock, Trash2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatearPesos, cn } from "@/lib/utils"
import { OFFLINE_MODE_ENABLED } from "@/lib/feature-flags"
import { useConnectivity } from "@/hooks/useConnectivity"
import { useVentasOffline } from "@/hooks/useVentasOffline"
import { getOfflineDB, type VentaOffline } from "@/lib/offline-db"
import { getFingerprint } from "@/lib/offline-fingerprint"

type Tab = "pendientes" | "sincronizadas"

/**
 * Pantalla de sincronización: tabs para "Pendientes" y "Sincronizadas (últimas 24h)".
 *
 * Si OFFLINE_MODE_ENABLED=false, muestra empty state simple sin tocar Dexie.
 */
export function PantallaSync() {
  if (!OFFLINE_MODE_ENABLED) {
    return (
      <div className="border rounded-lg p-12 text-center text-muted-foreground text-sm">
        El modo offline está deshabilitado. No hay ventas pendientes para sincronizar.
      </div>
    )
  }
  return <PantallaSyncInner />
}

function PantallaSyncInner() {
  const { online } = useConnectivity()
  const pendientes = useVentasOffline("PENDIENTE_SYNC") ?? []
  const errores = useVentasOffline("ERROR_SYNC") ?? []
  const sincronizadas = useVentasOffline("SINCRONIZADA") ?? []
  const [tab, setTab] = useState<Tab>("pendientes")
  const [sincronizandoTodas, setSincronizandoTodas] = useState(false)

  const lista = tab === "pendientes" ? [...pendientes, ...errores] : sincronizadas

  async function sincronizarUna(v: VentaOffline) {
    if (!online) {
      toast.error("Necesitás conexión para sincronizar.")
      return
    }
    try {
      const res = await fetch("/api/offline/sincronizar-venta", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fingerprint: getFingerprint(),
          clienteId: v.clienteSnapshot.id,
          detalles: v.lineas.map((l) => ({
            productoId:     l.productoId,
            unidadId:       l.unidadId,
            cantidad:       l.cantidad,
            precioUnitario: l.precioUnitario,
          })),
          descuento:                0,
          observaciones:            v.observaciones,
          numeroReservadoToken:     v.numeroToken,
          numeroReservadoFormateado: v.numeroReservado,
          clientRequestId:          v.clientRequestId,
          creadaEnOfflineISO:       v.creadaEn,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        await getOfflineDB().ventasOffline.update(v.id, {
          estado: "ERROR_SYNC",
          errorDetalle: data.error ?? `HTTP ${res.status}`,
        })
        toast.error(`Venta ${v.numeroReservado}: ${data.error ?? "Error"}`)
        return false
      }

      const data = await res.json() as { ok: boolean; ventaId: string; remitoId: string }
      await getOfflineDB().ventasOffline.update(v.id, {
        estado: "SINCRONIZADA",
        ventaIdServer: data.ventaId,
        remitoIdServer: data.remitoId,
        sincronizadaEn: new Date().toISOString(),
        errorDetalle: undefined,
      })
      toast.success(`Venta ${v.numeroReservado} sincronizada.`)
      return true
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error desconocido"
      await getOfflineDB().ventasOffline.update(v.id, {
        estado: "ERROR_SYNC",
        errorDetalle: msg,
      })
      toast.error(`Venta ${v.numeroReservado}: ${msg}`)
      return false
    }
  }

  async function sincronizarTodas() {
    if (sincronizandoTodas) return
    setSincronizandoTodas(true)
    try {
      let ok = 0, fail = 0
      for (const v of [...pendientes, ...errores]) {
        const r = await sincronizarUna(v)
        if (r) ok++; else fail++
      }
      toast.success(`Sincronización terminada. ${ok} OK, ${fail} con error.`)
    } finally {
      setSincronizandoTodas(false)
    }
  }

  async function descartar(v: VentaOffline) {
    if (!confirm(`¿Descartar la venta ${v.numeroReservado}? El número de remito queda sin usar.`)) return
    await getOfflineDB().ventasOffline.delete(v.id)
    toast.info("Venta descartada.")
  }

  const totalPendientes = pendientes.length + errores.length

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="border-b flex gap-2">
        <button
          onClick={() => setTab("pendientes")}
          className={cn(
            "px-3 py-2 text-sm font-medium border-b-2 -mb-px",
            tab === "pendientes" ? "border-primary text-primary" : "border-transparent text-muted-foreground",
          )}
        >
          Pendientes
          {totalPendientes > 0 && (
            <Badge variant="secondary" className="ml-2 text-xs">{totalPendientes}</Badge>
          )}
        </button>
        <button
          onClick={() => setTab("sincronizadas")}
          className={cn(
            "px-3 py-2 text-sm font-medium border-b-2 -mb-px",
            tab === "sincronizadas" ? "border-primary text-primary" : "border-transparent text-muted-foreground",
          )}
        >
          Sincronizadas (últimas 24h)
          {sincronizadas.length > 0 && (
            <Badge variant="outline" className="ml-2 text-xs">{sincronizadas.length}</Badge>
          )}
        </button>
      </div>

      {/* Acciones de tab "pendientes" */}
      {tab === "pendientes" && totalPendientes > 0 && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            {pendientes.length} pendientes
            {errores.length > 0 && <span className="text-destructive">, {errores.length} con error</span>}
          </p>
          <Button
            onClick={sincronizarTodas}
            disabled={!online || sincronizandoTodas}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", sincronizandoTodas && "animate-spin")} />
            {sincronizandoTodas ? "Sincronizando…" : "Sincronizar todas"}
          </Button>
        </div>
      )}

      {/* Listado */}
      {lista.length === 0 ? (
        <div className="border rounded-lg p-12 text-center text-muted-foreground text-sm">
          {tab === "pendientes"
            ? "No hay ventas offline pendientes de sincronizar."
            : "No hay ventas sincronizadas en las últimas 24h."}
        </div>
      ) : (
        <div className="space-y-3">
          {lista.map((v) => (
            <div
              key={v.id}
              className={cn(
                "border rounded-lg p-4",
                v.estado === "ERROR_SYNC" && "border-destructive/40 bg-destructive/5",
                v.estado === "SINCRONIZADA" && "border-emerald-300 bg-emerald-50/40",
              )}
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold font-mono">{v.numeroReservado}</p>
                    {v.estado === "PENDIENTE_SYNC" && (
                      <Badge variant="secondary" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />Pendiente
                      </Badge>
                    )}
                    {v.estado === "ERROR_SYNC" && (
                      <Badge variant="destructive" className="text-xs">
                        <AlertTriangle className="h-3 w-3 mr-1" />Con error
                      </Badge>
                    )}
                    {v.estado === "SINCRONIZADA" && (
                      <Badge className="text-xs bg-emerald-600">
                        <CheckCircle2 className="h-3 w-3 mr-1" />Sincronizada
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm mt-1">
                    {v.clienteSnapshot.nombreRazonSocial}
                    {" · "}{new Date(v.creadaEn).toLocaleString("es-AR")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {v.lineas.length} línea{v.lineas.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold tabular-nums">{formatearPesos(v.total)}</p>
                </div>
              </div>

              {/* Detalle líneas */}
              <details className="mt-3 text-sm">
                <summary className="cursor-pointer text-xs text-muted-foreground">Ver detalle</summary>
                <ul className="mt-2 space-y-1 text-xs">
                  {v.lineas.map((l, i) => (
                    <li key={i} className="flex justify-between">
                      <span>{l.productoNombre} · {l.cantidad} {l.unidadAbrev}</span>
                      <span className="tabular-nums">{formatearPesos(l.subtotal)}</span>
                    </li>
                  ))}
                </ul>
              </details>

              {v.errorDetalle && (
                <p className="mt-3 text-xs text-destructive bg-destructive/10 rounded px-2 py-1">
                  Error: {v.errorDetalle}
                </p>
              )}

              {v.estado !== "SINCRONIZADA" && (
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => sincronizarUna(v)}
                    disabled={!online || sincronizandoTodas}
                  >
                    {v.estado === "ERROR_SYNC" ? "Reintentar" : "Sincronizar"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => descartar(v)}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />Descartar
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
