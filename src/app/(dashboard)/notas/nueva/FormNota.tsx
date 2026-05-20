"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { generarClientRequestId, submitSeguro } from "@/lib/submit-helpers"
import { formatearPesos, cn } from "@/lib/utils"
import type { NotaInput } from "@/lib/validaciones/notas"

export interface LineaInicial {
  productoId:     string
  nombreProducto: string
  codigoProducto: string
  unidadId:       string
  abrevUnidad:    string
  cantidad:       number
  cantidadMax:    number
  precioUnitario: number
}

interface Props {
  tipo: "CREDITO" | "DEBITO"
  ventaId: string
  lineasIniciales: LineaInicial[]
  onSubmit: (data: NotaInput) => Promise<{ ok?: boolean; error?: string; notaId?: string }>
}

interface LineaState extends LineaInicial {
  incluida: boolean
  generaMovimientoStock: boolean
}

export function FormNota({ tipo, ventaId, lineasIniciales, onSubmit }: Props) {
  const router = useRouter()
  const idemRef = useRef(generarClientRequestId())
  const [lineas, setLineas] = useState<LineaState[]>(() =>
    lineasIniciales.map((l) => ({
      ...l,
      incluida: true,
      generaMovimientoStock: tipo === "CREDITO", // ND nunca afecta stock
    })),
  )
  const [motivo, setMotivo]     = useState("")
  const [letra, setLetra]       = useState<"A" | "B" | "C" | "X">("X")
  const [guardando, setGuardando] = useState(false)

  function setLinea(idx: number, patch: Partial<LineaState>) {
    setLineas((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)))
  }

  const lineasIncluidas = lineas.filter((l) => l.incluida)
  const total = lineasIncluidas.reduce((acc, l) => acc + l.cantidad * l.precioUnitario, 0)

  async function handleSubmit() {
    if (lineasIncluidas.length === 0) {
      toast.error("Agregá al menos una línea")
      return
    }
    if (motivo.trim().length < 3) {
      toast.error("Indicá el motivo de la nota")
      return
    }

    const data: NotaInput = {
      tipo,
      letra,
      ventaOrigenId: ventaId,
      motivo:        motivo.trim(),
      lineas: lineasIncluidas.map((l) => ({
        productoId:            l.productoId,
        unidadId:              l.unidadId,
        cantidad:              l.cantidad,
        precioUnitario:        l.precioUnitario,
        generaMovimientoStock: tipo === "CREDITO" && l.generaMovimientoStock,
      })),
      clientRequestId: idemRef.current,
    }

    setGuardando(true)
    try {
      const res = await submitSeguro(() => onSubmit(data))
      if (!res.ok) { toast.error(res.error); return }
      toast.success(`Nota de ${tipo === "CREDITO" ? "crédito" : "débito"} emitida`)
      const notaId = res.data.notaId
      if (notaId) router.push(`/notas/${notaId}`)
      else router.push(`/ventas/${ventaId}`)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="letra">Letra</Label>
          <select
            id="letra"
            value={letra}
            onChange={(e) => setLetra(e.target.value as "A" | "B" | "C" | "X")}
            className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            <option value="X">X (sin letra fiscal)</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label>Tipo</Label>
          <div>
            <Badge variant={tipo === "CREDITO" ? "secondary" : "default"} className="text-sm">
              {tipo === "CREDITO" ? "Nota de crédito" : "Nota de débito"}
            </Badge>
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="motivo">Motivo *</Label>
        <Textarea
          id="motivo"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder={
            tipo === "CREDITO"
              ? "Devolución parcial / descuento posterior / error en facturación..."
              : "Cargo adicional / ajuste de precio..."
          }
          rows={3}
        />
      </div>

      <Separator />

      {/* Líneas */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold">Líneas de la nota</h2>
        <p className="text-xs text-muted-foreground">
          Marcá las líneas a incluir. La cantidad puede ser menor a la facturada (no mayor).
          {tipo === "CREDITO" && (
            <> Si la NC repone stock, dejá marcado &quot;Devuelve stock&quot;.</>
          )}
        </p>

        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">Incluir</th>
                <th className="text-left px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">Producto</th>
                <th className="text-right px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">Cant.</th>
                <th className="text-right px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">Precio</th>
                <th className="text-right px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">Subtotal</th>
                {tipo === "CREDITO" && (
                  <th className="text-center px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">Stock</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y">
              {lineas.map((l, i) => {
                const subtotal = l.cantidad * l.precioUnitario
                const excede = l.cantidad > l.cantidadMax + 0.0005
                return (
                  <tr key={i} className={cn(!l.incluida && "opacity-50")}>
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={l.incluida}
                        onChange={(e) => setLinea(i, { incluida: e.target.checked })}
                        className="accent-primary"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <p className="font-medium">{l.nombreProducto}</p>
                      <p className="text-xs text-muted-foreground">
                        {l.codigoProducto} · {l.abrevUnidad}
                      </p>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Input
                        type="number"
                        step="0.001"
                        min="0.001"
                        max={l.cantidadMax}
                        value={l.cantidad}
                        onChange={(e) =>
                          setLinea(i, { cantidad: Number(e.target.value) || 0 })
                        }
                        disabled={!l.incluida}
                        className={cn("h-8 text-sm text-right w-24 ml-auto", excede && "border-amber-400")}
                      />
                      <p className="text-[10px] text-muted-foreground mt-0.5">/ {l.cantidadMax}</p>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={l.precioUnitario}
                        onChange={(e) =>
                          setLinea(i, { precioUnitario: Number(e.target.value) || 0 })
                        }
                        disabled={!l.incluida}
                        className="h-8 text-sm text-right w-24 ml-auto"
                      />
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium">
                      {l.incluida ? formatearPesos(subtotal) : "—"}
                    </td>
                    {tipo === "CREDITO" && (
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={l.generaMovimientoStock}
                          onChange={(e) =>
                            setLinea(i, { generaMovimientoStock: e.target.checked })
                          }
                          disabled={!l.incluida}
                          className="accent-primary"
                          title="Devuelve stock al inventario"
                        />
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="border-t bg-muted/20 font-semibold">
              <tr>
                <td colSpan={tipo === "CREDITO" ? 4 : 3} className="px-3 py-2 text-right">Total</td>
                <td className="px-3 py-2 text-right text-lg tabular-nums">
                  {formatearPesos(total)}
                </td>
                {tipo === "CREDITO" && <td />}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={handleSubmit} disabled={guardando || total <= 0}>
          {guardando ? "Emitiendo…" : `Emitir nota de ${tipo === "CREDITO" ? "crédito" : "débito"}`}
        </Button>
        <Button variant="outline" onClick={() => router.back()} disabled={guardando}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}
