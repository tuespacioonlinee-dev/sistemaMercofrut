"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { CloudOff, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { formatearPesos, cn } from "@/lib/utils"
import { generarClientRequestId } from "@/lib/submit-helpers"
import { getOfflineDB, type VentaOffline, type LineaSnap } from "@/lib/offline-db"
import { useSnapshotClientes, useSnapshotProductos } from "@/hooks/useSnapshotsOffline"
import { useReservasDisponibles, useTomarReserva } from "@/hooks/useReservasOffline"

/**
 * Form de venta en modo offline.
 *
 * - Lee clientes/productos de IndexedDB (snapshots)
 * - Condición forzada a CONTADO (CC requiere consulta de saldo)
 * - Guarda en IndexedDB con un número del pool de reservas
 * - Muestra contador de reservas disponibles
 *
 * Solo se monta cuando OFFLINE_MODE_ENABLED && !online.
 */
export function FormVentaOffline() {
  const router = useRouter()
  const clientes = useSnapshotClientes()
  const productos = useSnapshotProductos()
  const reservas = useReservasDisponibles()
  const tomarReserva = useTomarReserva()

  const [clienteId, setClienteId] = useState<string>("")
  const [lineas, setLineas] = useState<Array<{ productoId: string; cantidad: number; precio: number }>>([
    { productoId: "", cantidad: 1, precio: 0 },
  ])
  const [observaciones, setObservaciones] = useState("")
  const [guardando, setGuardando] = useState(false)

  const subtotal = lineas.reduce((acc, l) => acc + l.cantidad * l.precio, 0)
  const total = subtotal

  function setLinea(idx: number, patch: Partial<{ productoId: string; cantidad: number; precio: number }>) {
    setLineas((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)))
  }

  function onProductoChange(idx: number, productoId: string) {
    const p = productos.find((x) => x.id === productoId)
    setLinea(idx, { productoId, precio: p?.precioVenta ?? 0 })
  }

  async function handleSubmit() {
    if (!clienteId) { toast.error("Seleccioná un cliente"); return }
    if (lineas.length === 0 || lineas.every((l) => !l.productoId || l.cantidad <= 0)) {
      toast.error("Agregá al menos una línea válida")
      return
    }
    if (reservas.length === 0) {
      toast.error("Sin números reservados disponibles. Pediles a alguien online que sincronice antes.")
      return
    }

    setGuardando(true)
    try {
      // 1. Tomar reserva
      const reserva = await tomarReserva()
      if (!reserva) {
        toast.error("No quedan números de remito disponibles offline.")
        return
      }

      const clienteSnap = clientes.find((c) => c.id === clienteId)
      if (!clienteSnap) {
        toast.error("Cliente no encontrado en el snapshot local.")
        return
      }

      const lineasSnap: LineaSnap[] = lineas
        .filter((l) => l.productoId && l.cantidad > 0)
        .map((l) => {
          const p = productos.find((x) => x.id === l.productoId)!
          return {
            productoId:     l.productoId,
            productoNombre: p.nombre,
            productoCodigo: p.codigo,
            unidadId:       p.unidadBaseId,
            unidadAbrev:    p.unidadBaseAbrev,
            cantidad:       l.cantidad,
            precioUnitario: l.precio,
            subtotal:       l.cantidad * l.precio,
          }
        })

      const id = generarClientRequestId()
      const ventaOffline: VentaOffline = {
        id,
        numeroReservado: reserva.numeroFormateado,
        numeroToken:     reserva.token,
        numeroValor:     reserva.numeroValor,
        fecha:           new Date().toISOString(),
        clienteSnapshot: clienteSnap,
        lineas:          lineasSnap,
        subtotal,
        descuento:       0,
        total,
        condicion:       "CONTADO",
        observaciones:   observaciones.trim() || undefined,
        clientRequestId: id,
        estado:          "PENDIENTE_SYNC",
        creadaEn:        new Date().toISOString(),
      }

      await getOfflineDB().ventasOffline.add(ventaOffline)

      toast.success(
        `Venta guardada localmente con remito ${reserva.numeroFormateado}. ` +
        `Se sincronizará al volver internet.`,
      )
      router.push("/ventas/sincronizar")
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Aviso modo offline */}
      <div className="border border-amber-300 bg-amber-50 rounded-lg p-4 flex items-start gap-3">
        <CloudOff className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
        <div className="text-sm">
          <p className="font-semibold text-amber-900">Estás cargando una venta sin conexión.</p>
          <p className="text-amber-800 mt-0.5">
            Condición forzada a <strong>CONTADO</strong> (no se puede consultar cuenta corriente offline).
            La venta queda guardada local y se sincroniza al volver online.
          </p>
          <p className="text-xs text-amber-700 mt-2">
            Reservas disponibles: <strong>{reservas.length}</strong>
          </p>
        </div>
      </div>

      {/* Cliente */}
      <div className="space-y-1">
        <Label htmlFor="cliente-offline">Cliente *</Label>
        <select
          id="cliente-offline"
          name="clienteId"
          value={clienteId}
          onChange={(e) => setClienteId(e.target.value)}
          className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
        >
          <option value="">Seleccioná un cliente del snapshot local…</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombreRazonSocial} — {c.documento}
            </option>
          ))}
        </select>
        {clientes.length === 0 && (
          <p className="text-xs text-destructive">
            No hay clientes en el snapshot local. Reconectá brevemente para refrescar.
          </p>
        )}
      </div>

      <Separator />

      {/* Líneas */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Productos</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setLineas([...lineas, { productoId: "", cantidad: 1, precio: 0 }])}
          >
            <Plus className="h-4 w-4 mr-1" />Agregar
          </Button>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">Producto</th>
                <th className="text-right px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">Cant.</th>
                <th className="text-right px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">Precio</th>
                <th className="text-right px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">Subtotal</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y">
              {lineas.map((l, i) => {
                const p = productos.find((x) => x.id === l.productoId)
                const sub = l.cantidad * l.precio
                return (
                  <tr key={i}>
                    <td className="px-3 py-2">
                      <select
                        value={l.productoId}
                        onChange={(e) => onProductoChange(i, e.target.value)}
                        className="h-8 w-full rounded border border-input bg-transparent px-2 text-sm"
                      >
                        <option value="">Elegir…</option>
                        {productos.map((prod) => (
                          <option key={prod.id} value={prod.id}>{prod.nombre}</option>
                        ))}
                      </select>
                      {p && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {p.codigo} · stock ≈ {p.stockAproximado.toFixed(0)} {p.unidadBaseAbrev}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Input
                        type="number"
                        step="0.001"
                        min="0.001"
                        value={l.cantidad}
                        onChange={(e) => setLinea(i, { cantidad: Number(e.target.value) || 0 })}
                        className="h-8 text-sm text-right w-20 ml-auto"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={l.precio}
                        onChange={(e) => setLinea(i, { precio: Number(e.target.value) || 0 })}
                        className="h-8 text-sm text-right w-24 ml-auto"
                      />
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium">
                      {formatearPesos(sub)}
                    </td>
                    <td className="px-3 py-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={lineas.length === 1}
                        onClick={() => setLineas(lineas.filter((_, idx) => idx !== i))}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="border-t bg-muted/20 font-semibold">
              <tr>
                <td colSpan={3} className="px-3 py-2 text-right">Total</td>
                <td className="px-3 py-2 text-right text-lg tabular-nums">
                  {formatearPesos(total)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="obs-offline">Observaciones</Label>
        <Input
          id="obs-offline"
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          placeholder="Notas opcionales…"
        />
      </div>

      <div className="flex items-center gap-3">
        <Button
          onClick={handleSubmit}
          disabled={guardando || total <= 0 || reservas.length === 0}
          className={cn("min-w-40", reservas.length === 0 && "opacity-60")}
        >
          {guardando ? "Guardando…" : "Guardar venta offline"}
        </Button>
        <Button variant="outline" onClick={() => router.push("/ventas")} disabled={guardando}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}
