"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Eye, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
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

export function ComprasTable({ compras }: Props) {
  const [anulando, setAnulando] = useState<CompraRow | null>(null)
  const [motivo, setMotivo] = useState("")
  const [isPending, startTransition] = useTransition()

  const formatPrecio = (val: unknown) =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(Number(val))

  const formatFecha = (d: Date) =>
    new Intl.DateTimeFormat("es-AR", { dateStyle: "short" }).format(new Date(d))

  function confirmarAnulacion() {
    if (!anulando || !motivo.trim()) return
    startTransition(async () => {
      const res = await anularCompra(anulando.id, motivo)
      if (res.error) {
        toast.error(res.error)
        return
      }
      toast.success("Compra anulada")
      setAnulando(null)
      setMotivo("")
    })
  }

  return (
    <>
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
            {compras.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-10 text-slate-400">
                  No hay compras registradas todavía.
                </td>
              </tr>
            )}
            {compras.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-500">{formatFecha(c.fecha)}</td>
                <td className="px-4 py-3 font-medium">{c.proveedor.nombreRazonSocial}</td>
                <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                  {c.numeroComprobante ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <Badge variant="secondary">
                    {c.condicion === "CONTADO" ? "Contado" : "Cuenta Corriente"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right font-medium">{formatPrecio(c.total)}</td>
                <td className="px-4 py-3">
                  <Badge variant={BADGE_ESTADO[c.estado] ?? "secondary"}>
                    {c.estado}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right space-x-1">
                  <Link
                    href={`/compras/${c.id}`}
                    className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                  >
                    <Eye className="w-4 h-4" />
                  </Link>
                  {c.estado !== "ANULADA" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setAnulando(c)}
                      title="Anular compra"
                    >
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
          <DialogHeader>
            <DialogTitle>Anular compra</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Esta acción revierte el stock ingresado con esta compra. No se puede deshacer.
          </p>
          <div className="space-y-1">
            <Label>Motivo de anulación *</Label>
            <Input
              value={motivo}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMotivo(e.target.value)}
              placeholder="ej: Error en los precios"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAnulando(null); setMotivo("") }}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmarAnulacion}
              disabled={!motivo.trim() || isPending}
            >
              {isPending ? "Anulando..." : "Confirmar anulación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
