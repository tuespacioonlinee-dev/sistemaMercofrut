"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Eye, XCircle, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { anularCompra } from "@/server/actions/compras"

type CompraRow = {
  id: string
  fecha: Date
  numeroComprobante: string | null
  condicion: string
  estado: string
  total: unknown
  proveedor: { nombreRazonSocial: string }
  creadaPor: { nombre: string }
}

interface Props {
  compras: CompraRow[]
}

const BADGE_ESTADO: Record<string, "default" | "secondary" | "destructive"> = {
  RECIBIDA: "default",
  PENDIENTE: "secondary",
  ANULADA: "destructive",
}

const LABEL_CONDICION: Record<string, string> = {
  CONTADO: "Contado",
  CUENTA_CORRIENTE: "Cuenta Corriente",
}

export function ComprasTable({ compras }: Props) {
  const [busqueda, setBusqueda] = useState("")
  const [filtroEstado, setFiltroEstado] = useState("TODOS")
  const [filtroCondicion, setFiltroCondicion] = useState("TODOS")
  const [anulando, setAnulando] = useState<CompraRow | null>(null)
  const [motivo, setMotivo] = useState("")
  const [isPending, startTransition] = useTransition()

  const filtradas = compras.filter((c) => {
    const coincideBusqueda =
      c.proveedor.nombreRazonSocial.toLowerCase().includes(busqueda.toLowerCase()) ||
      (c.numeroComprobante ?? "").toLowerCase().includes(busqueda.toLowerCase())
    const coincideEstado = filtroEstado === "TODOS" || c.estado === filtroEstado
    const coincideCondicion = filtroCondicion === "TODOS" || c.condicion === filtroCondicion
    return coincideBusqueda && coincideEstado && coincideCondicion
  })

  const formatPrecio = (val: unknown) =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(Number(val))

  const formatFecha = (d: Date) =>
    new Intl.DateTimeFormat("es-AR", { dateStyle: "short" }).format(new Date(d))

  function confirmarAnulacion() {
    if (!anulando || !motivo.trim()) return
    startTransition(async () => {
      const res = await anularCompra(anulando.id, motivo)
      if (res.error) { toast.error(res.error); return }
      toast.success("Compra anulada")
      setAnulando(null)
      setMotivo("")
    })
  }

  return (
    <>
      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar proveedor o comprobante..."
            className="pl-9"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <Select value={filtroEstado} onValueChange={(v) => v && setFiltroEstado(v)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos los estados</SelectItem>
            <SelectItem value="RECIBIDA">Recibida</SelectItem>
            <SelectItem value="PENDIENTE">Pendiente</SelectItem>
            <SelectItem value="ANULADA">Anulada</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroCondicion} onValueChange={(v) => v && setFiltroCondicion(v)}>
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Condición" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todas las condiciones</SelectItem>
            <SelectItem value="CONTADO">Contado</SelectItem>
            <SelectItem value="CUENTA_CORRIENTE">Cuenta Corriente</SelectItem>
          </SelectContent>
        </Select>
        {(busqueda || filtroEstado !== "TODOS" || filtroCondicion !== "TODOS") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setBusqueda(""); setFiltroEstado("TODOS"); setFiltroCondicion("TODOS") }}
            className="text-muted-foreground"
          >
            Limpiar filtros
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {filtradas.length} de {compras.length} compra{compras.length !== 1 ? "s" : ""}
      </p>

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Fecha</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Proveedor</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Comprobante</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Condición</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Total</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Estado</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtradas.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-10 text-slate-400">
                  {busqueda || filtroEstado !== "TODOS" || filtroCondicion !== "TODOS"
                    ? "Sin resultados para los filtros aplicados."
                    : "No hay compras registradas todavía."}
                </td>
              </tr>
            )}
            {filtradas.map((c) => (
              <tr key={c.id} className={cn("hover:bg-slate-50", c.estado === "ANULADA" && "opacity-60")}>
                <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatFecha(c.fecha)}</td>
                <td className="px-4 py-3 font-medium">{c.proveedor.nombreRazonSocial}</td>
                <td className="px-4 py-3 text-slate-500 font-mono text-xs">{c.numeroComprobante ?? "—"}</td>
                <td className="px-4 py-3">
                  <Badge variant="secondary">{LABEL_CONDICION[c.condicion] ?? c.condicion}</Badge>
                </td>
                <td className="px-4 py-3 text-right font-medium">{formatPrecio(c.total)}</td>
                <td className="px-4 py-3">
                  <Badge variant={BADGE_ESTADO[c.estado] ?? "secondary"}>{c.estado}</Badge>
                </td>
                <td className="px-4 py-3 text-right space-x-1">
                  <Link href={`/compras/${c.id}`} className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
                    <Eye className="w-4 h-4" />
                  </Link>
                  {c.estado !== "ANULADA" && (
                    <Button variant="ghost" size="sm" onClick={() => setAnulando(c)} title="Anular compra">
                      <XCircle className="w-4 h-4 text-red-500" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!anulando} onOpenChange={(o) => { if (!o) { setAnulando(null); setMotivo("") } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Anular compra</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600">
            Esta acción revierte el stock ingresado. No se puede deshacer.
          </p>
          <div className="space-y-1">
            <Label>Motivo de anulación *</Label>
            <Input
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="ej: Error en los precios"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAnulando(null); setMotivo("") }}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmarAnulacion} disabled={!motivo.trim() || isPending}>
              {isPending ? "Anulando..." : "Confirmar anulación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
