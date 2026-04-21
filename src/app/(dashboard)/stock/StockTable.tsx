"use client"

import { useState } from "react"
import Link from "next/link"
import { differenceInDays } from "date-fns"
import { Search, AlertTriangle, History } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AjusteStockModal } from "./AjusteStockModal"
import { cn } from "@/lib/utils"

type ProductoStock = {
  id: string
  codigo: string
  nombre: string
  stockTotal: unknown
  stockMinimo: unknown
  controlaVencimiento: boolean
  categoria: { nombre: string }
  unidadBase: { abreviatura: string }
  lotes: { id: string; fechaVencimiento: Date | null; cantidadActual: unknown; numeroLote: string | null }[]
}

interface Props {
  productos: ProductoStock[]
  categorias: string[]
}

export function StockTable({ productos, categorias }: Props) {
  const [busqueda, setBusqueda] = useState("")
  const [filtroCategoria, setFiltroCategoria] = useState("TODAS")
  const [filtroEstado, setFiltroEstado] = useState("TODOS")

  const filtrados = productos.filter((p) => {
    const stock = Number(p.stockTotal)
    const minimo = Number(p.stockMinimo)

    const coincideBusqueda =
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.codigo.toLowerCase().includes(busqueda.toLowerCase())

    const coincideCategoria =
      filtroCategoria === "TODAS" || p.categoria.nombre === filtroCategoria

    const coincideEstado =
      filtroEstado === "TODOS" ||
      (filtroEstado === "SIN_STOCK" && stock === 0) ||
      (filtroEstado === "BAJO_MINIMO" && minimo > 0 && stock <= minimo && stock > 0) ||
      (filtroEstado === "OK" && stock > 0 && (minimo === 0 || stock > minimo))

    return coincideBusqueda && coincideCategoria && coincideEstado
  })

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
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
            {categorias.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filtroEstado} onValueChange={(v) => v && setFiltroEstado(v)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos</SelectItem>
            <SelectItem value="OK">OK</SelectItem>
            <SelectItem value="BAJO_MINIMO">Bajo mínimo</SelectItem>
            <SelectItem value="SIN_STOCK">Sin stock</SelectItem>
          </SelectContent>
        </Select>
        {(busqueda || filtroCategoria !== "TODAS" || filtroEstado !== "TODOS") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setBusqueda(""); setFiltroCategoria("TODAS"); setFiltroEstado("TODOS") }}
            className="text-muted-foreground"
          >
            Limpiar
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {filtrados.length} de {productos.length} producto{productos.length !== 1 ? "s" : ""}
      </p>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Producto</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Categoría</th>
              <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Stock actual</th>
              <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Mínimo</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Estado</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Vencimientos</th>
              <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtrados.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-muted-foreground">
                  Sin resultados para los filtros aplicados.
                </td>
              </tr>
            ) : (
              filtrados.map((p) => {
                const stock = Number(p.stockTotal)
                const minimo = Number(p.stockMinimo)
                const bajoDeMin = minimo > 0 && stock <= minimo
                const sinStock = stock === 0
                const lotesProximos = p.lotes.filter((l) => {
                  if (!l.fechaVencimiento) return false
                  return differenceInDays(new Date(l.fechaVencimiento), new Date()) <= 7
                })
                return (
                  <tr key={p.id} className={cn("hover:bg-muted/20 transition-colors", bajoDeMin && "bg-amber-50/50")}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{p.nombre}</p>
                      <p className="text-xs text-muted-foreground">{p.codigo}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.categoria.nombre}</td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {stock.toLocaleString("es-AR", { maximumFractionDigits: 3 })} {p.unidadBase.abreviatura}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {minimo > 0 ? `${minimo.toLocaleString("es-AR", { maximumFractionDigits: 3 })} ${p.unidadBase.abreviatura}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {sinStock ? (
                        <Badge variant="destructive">Sin stock</Badge>
                      ) : bajoDeMin ? (
                        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Bajo mínimo</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-green-700 bg-green-50">OK</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {p.controlaVencimiento && lotesProximos.length > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {lotesProximos.length} lote{lotesProximos.length > 1 ? "s" : ""} por vencer
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <AjusteStockModal
                          productoId={p.id}
                          nombreProducto={p.nombre}
                          stockActual={stock}
                          unidad={p.unidadBase.abreviatura}
                        />
                        <Link
                          href={`/stock/${p.id}/movimientos`}
                          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                          title="Ver movimientos"
                        >
                          <History className="h-4 w-4" />
                          <span className="sr-only">Movimientos</span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
