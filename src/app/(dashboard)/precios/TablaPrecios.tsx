"use client"

import { useState, useTransition, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Search, Save, RotateCcw, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { actualizarPrecios } from "@/server/actions/precios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

type Producto = {
  id: string
  codigo: string
  nombre: string
  precioVenta: number
  precioCompra: number
  categoria: string
}

interface Props {
  productos: Producto[]
  categorias: string[]
}

type Draft = { precioVenta: string; precioCompra: string }

export function TablaPrecios({ productos, categorias }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [busqueda, setBusqueda] = useState("")
  const [filtroCategoria, setFiltroCategoria] = useState("TODAS")
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})

  const filtrados = productos.filter((p) => {
    const coincideBusqueda =
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.codigo.toLowerCase().includes(busqueda.toLowerCase())
    const coincideCategoria = filtroCategoria === "TODAS" || p.categoria === filtroCategoria
    return coincideBusqueda && coincideCategoria
  })

  const getValor = useCallback(
    (id: string, campo: keyof Draft, original: number) =>
      drafts[id]?.[campo] ?? original.toFixed(2),
    [drafts]
  )

  function handleChange(id: string, campo: keyof Draft, valor: string) {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...prev[id], [campo]: valor },
    }))
  }

  // Aplicar porcentaje a todos los filtrados
  function aplicarPorcentaje(campo: keyof Draft, porcentaje: number) {
    setDrafts((prev) => {
      const next = { ...prev }
      for (const p of filtrados) {
        const original = campo === "precioVenta" ? p.precioVenta : p.precioCompra
        const actual = parseFloat(prev[p.id]?.[campo] ?? original.toFixed(2))
        const nuevo = actual * (1 + porcentaje / 100)
        next[p.id] = { ...next[p.id], [campo]: nuevo.toFixed(2) }
      }
      return next
    })
  }

  function resetearCambios() {
    setDrafts({})
  }

  const cambiosPendientes = Object.keys(drafts).filter((id) => {
    const p = productos.find((x) => x.id === id)
    if (!p) return false
    const draft = drafts[id]
    const ventaCambio = draft?.precioVenta !== undefined && parseFloat(draft.precioVenta) !== p.precioVenta
    const compraCambio = draft?.precioCompra !== undefined && parseFloat(draft.precioCompra) !== p.precioCompra
    return ventaCambio || compraCambio
  })

  function guardar() {
    if (cambiosPendientes.length === 0) {
      toast.info("No hay cambios para guardar.")
      return
    }

    const updates = cambiosPendientes.map((id) => {
      const p = productos.find((x) => x.id === id)!
      const draft = drafts[id]
      return {
        id,
        precioVenta: draft?.precioVenta !== undefined ? parseFloat(draft.precioVenta) : p.precioVenta,
        precioCompra: draft?.precioCompra !== undefined ? parseFloat(draft.precioCompra) : p.precioCompra,
      }
    })

    startTransition(async () => {
      const res = await actualizarPrecios(updates)
      if (res.error) { toast.error(res.error); return }
      toast.success(`${res.cantidad} precio${res.cantidad !== 1 ? "s" : ""} actualizado${res.cantidad !== 1 ? "s" : ""}.`)
      setDrafts({})
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      {/* Filtros y acciones */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o código..."
            className="pl-9"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <Select value={filtroCategoria} onValueChange={(v) => v && setFiltroCategoria(v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODAS">Todas las categorías</SelectItem>
            {categorias.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1 ml-auto">
          <span className="text-xs text-muted-foreground mr-1">P. Venta +%:</span>
          {[5, 10, 15, 20].map((pct) => (
            <Button key={pct} variant="outline" size="sm" className="h-7 px-2 text-xs"
              onClick={() => aplicarPorcentaje("precioVenta", pct)}>
              +{pct}%
            </Button>
          ))}
        </div>
      </div>

      {/* Barra de estado */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {filtrados.length} de {productos.length} productos
          {cambiosPendientes.length > 0 && (
            <span className="ml-2 text-amber-600 font-medium">· {cambiosPendientes.length} cambio{cambiosPendientes.length !== 1 ? "s" : ""} sin guardar</span>
          )}
        </p>
        <div className="flex gap-2">
          {cambiosPendientes.length > 0 && (
            <Button variant="outline" size="sm" onClick={resetearCambios}>
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Descartar
            </Button>
          )}
          <Button size="sm" onClick={guardar} disabled={isPending || cambiosPendientes.length === 0}>
            <Save className="h-3.5 w-3.5 mr-1" />
            {isPending ? "Guardando..." : `Guardar${cambiosPendientes.length > 0 ? ` (${cambiosPendientes.length})` : ""}`}
          </Button>
        </div>
      </div>

      {/* Tabla */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Producto</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Categoría</th>
              <th className="text-right px-4 py-3 font-semibold text-muted-foreground w-36">P. Compra ($)</th>
              <th className="text-right px-4 py-3 font-semibold text-muted-foreground w-36">P. Venta ($)</th>
              <th className="text-right px-4 py-3 font-semibold text-muted-foreground w-24">Margen</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtrados.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-10 text-muted-foreground">
                  Sin resultados.
                </td>
              </tr>
            ) : filtrados.map((p) => {
              const venta = parseFloat(getValor(p.id, "precioVenta", p.precioVenta))
              const compra = parseFloat(getValor(p.id, "precioCompra", p.precioCompra))
              const margen = compra > 0 ? ((venta - compra) / compra) * 100 : null
              const cambio = drafts[p.id] && (
                parseFloat(drafts[p.id]?.precioVenta ?? p.precioVenta.toString()) !== p.precioVenta ||
                parseFloat(drafts[p.id]?.precioCompra ?? p.precioCompra.toString()) !== p.precioCompra
              )

              return (
                <tr key={p.id} className={cn("hover:bg-muted/20 transition-colors", cambio && "bg-amber-50/40")}>
                  <td className="px-4 py-2.5">
                    <p className="font-medium">{p.nombre}</p>
                    <p className="text-xs text-muted-foreground font-mono">{p.codigo}</p>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{p.categoria}</td>
                  <td className="px-4 py-2.5 text-right">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      className="h-7 w-28 text-right text-xs ml-auto"
                      value={getValor(p.id, "precioCompra", p.precioCompra)}
                      onChange={(e) => handleChange(p.id, "precioCompra", e.target.value)}
                    />
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      className="h-7 w-28 text-right text-xs ml-auto"
                      value={getValor(p.id, "precioVenta", p.precioVenta)}
                      onChange={(e) => handleChange(p.id, "precioVenta", e.target.value)}
                    />
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {margen !== null ? (
                      <span className={cn(
                        "inline-flex items-center gap-0.5 text-xs font-medium",
                        margen >= 20 ? "text-green-600" : margen >= 10 ? "text-amber-600" : "text-red-600"
                      )}>
                        {margen > 0 ? <TrendingUp className="h-3 w-3" /> : margen < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                        {margen.toFixed(1)}%
                      </span>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
