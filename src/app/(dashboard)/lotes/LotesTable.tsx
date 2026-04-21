"use client"

import { useState } from "react"
import { format, differenceInDays, isPast } from "date-fns"
import { es } from "date-fns/locale"
import { Search, AlertTriangle, PackageX, CheckCircle2, CalendarClock } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CerrarLoteButton } from "./CerrarLoteButton"
import { cn } from "@/lib/utils"

type Lote = {
  id: string
  numeroLote: string | null
  fechaIngreso: Date
  fechaVencimiento: Date | null
  cantidadInicial: unknown
  cantidadActual: unknown
  producto: {
    id: string
    nombre: string
    codigo: string
    unidadBase: { abreviatura: string }
    categoria: { nombre: string }
  }
}

interface Props {
  lotes: Lote[]
}

function EstadoVencimiento({ fecha }: { fecha: Date | null }) {
  if (!fecha) return <span className="text-xs text-muted-foreground">Sin fecha</span>
  const diasRestantes = differenceInDays(fecha, new Date())
  const vencido = isPast(fecha)
  if (vencido) return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
      <PackageX className="h-3.5 w-3.5" /> Vencido
    </span>
  )
  if (diasRestantes <= 3) return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-500">
      <AlertTriangle className="h-3.5 w-3.5" /> Vence en {diasRestantes}d
    </span>
  )
  if (diasRestantes <= 7) return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
      <AlertTriangle className="h-3.5 w-3.5" /> Vence en {diasRestantes}d
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-xs text-green-700">
      <CheckCircle2 className="h-3.5 w-3.5" /> {diasRestantes}d
    </span>
  )
}

export function LotesTable({ lotes }: Props) {
  const [busqueda, setBusqueda] = useState("")
  const [filtroEstado, setFiltroEstado] = useState("TODOS")

  const filtrados = lotes.filter((l) => {
    const coincideBusqueda =
      l.producto.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (l.numeroLote ?? "").toLowerCase().includes(busqueda.toLowerCase()) ||
      l.producto.categoria.nombre.toLowerCase().includes(busqueda.toLowerCase())

    const diasRestantes = l.fechaVencimiento
      ? differenceInDays(new Date(l.fechaVencimiento), new Date())
      : null
    const vencido = l.fechaVencimiento ? isPast(new Date(l.fechaVencimiento)) : false

    const coincideEstado =
      filtroEstado === "TODOS" ||
      (filtroEstado === "VENCIDO" && vencido) ||
      (filtroEstado === "CRITICO" && !vencido && diasRestantes !== null && diasRestantes <= 3) ||
      (filtroEstado === "POR_VENCER" && !vencido && diasRestantes !== null && diasRestantes <= 7 && diasRestantes > 3) ||
      (filtroEstado === "OK" && (diasRestantes === null || (!vencido && diasRestantes > 7)))

    return coincideBusqueda && coincideEstado
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar producto, lote o categoría..."
            className="pl-9"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <Select value={filtroEstado} onValueChange={(v) => v && setFiltroEstado(v)}>
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos</SelectItem>
            <SelectItem value="OK">OK (más de 7d)</SelectItem>
            <SelectItem value="POR_VENCER">Por vencer (4-7d)</SelectItem>
            <SelectItem value="CRITICO">Crítico (≤3d)</SelectItem>
            <SelectItem value="VENCIDO">Vencido</SelectItem>
          </SelectContent>
        </Select>
        {(busqueda || filtroEstado !== "TODOS") && (
          <Button
            variant="ghost" size="sm"
            onClick={() => { setBusqueda(""); setFiltroEstado("TODOS") }}
            className="text-muted-foreground"
          >
            Limpiar
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {filtrados.length} de {lotes.length} lote{lotes.length !== 1 ? "s" : ""}
      </p>

      {filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border rounded-lg bg-muted/30">
          <p className="text-muted-foreground">
            {busqueda || filtroEstado !== "TODOS"
              ? "Sin resultados para los filtros aplicados."
              : "No hay lotes activos."}
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Producto</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">N° Lote</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Ingreso</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Vencimiento</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Estado</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Cantidad actual</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Inicial</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtrados.map((lote) => {
                const vencido = lote.fechaVencimiento && isPast(new Date(lote.fechaVencimiento))
                const diasRestantes = lote.fechaVencimiento
                  ? differenceInDays(new Date(lote.fechaVencimiento), new Date())
                  : null
                const critico = diasRestantes !== null && diasRestantes <= 3 && !vencido
                return (
                  <tr
                    key={lote.id}
                    className={cn(
                      "hover:bg-muted/20 transition-colors",
                      vencido && "bg-red-50/60",
                      critico && "bg-amber-50/60"
                    )}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium">{lote.producto.nombre}</p>
                      <p className="text-xs text-muted-foreground">{lote.producto.categoria.nombre}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {lote.numeroLote ?? <span className="text-xs italic">Sin número</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {format(new Date(lote.fechaIngreso), "dd/MM/yyyy", { locale: es })}
                    </td>
                    <td className="px-4 py-3">
                      {lote.fechaVencimiento
                        ? format(new Date(lote.fechaVencimiento), "dd/MM/yyyy", { locale: es })
                        : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <EstadoVencimiento fecha={lote.fechaVencimiento ? new Date(lote.fechaVencimiento) : null} />
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {Number(lote.cantidadActual).toLocaleString("es-AR", { maximumFractionDigits: 3 })}{" "}
                      <span className="font-normal text-muted-foreground">{lote.producto.unidadBase.abreviatura}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {Number(lote.cantidadInicial).toLocaleString("es-AR", { maximumFractionDigits: 3 })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <CerrarLoteButton id={lote.id} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
