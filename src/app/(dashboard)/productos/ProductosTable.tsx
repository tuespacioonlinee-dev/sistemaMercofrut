"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Pencil, Power, Search } from "lucide-react"
import { toggleProductoActivo } from "@/server/actions/productos"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

type ProductoRow = {
  id: string
  codigo: string
  nombre: string
  activo: boolean
  precioVenta: unknown
  precioCompra: unknown
  stockTotal: unknown
  stockMinimo: unknown
  categoria: { nombre: string }
  unidadBase: { abreviatura: string }
}

interface Props {
  productos: ProductoRow[]
}

export function ProductosTable({ productos }: Props) {
  const [busqueda, setBusqueda] = useState("")
  const [isPending, startTransition] = useTransition()

  const filtrados = productos.filter(
    (p) =>
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.categoria.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  function toggleActivo(p: ProductoRow) {
    startTransition(async () => {
      await toggleProductoActivo(p.id, !p.activo)
      toast.success(p.activo ? "Producto desactivado" : "Producto activado")
    })
  }

  const formatPrecio = (val: unknown) =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(
      Number(val)
    )

  return (
    <div className="space-y-3">
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Buscar por nombre, código o categoría..."
          className="pl-9"
          value={busqueda}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBusqueda(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Código</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Nombre</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Categoría</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Unidad</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Stock</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">P. Venta</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Estado</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-10 text-slate-400">
                  {busqueda ? "Sin resultados para tu búsqueda." : "No hay productos todavía."}
                </td>
              </tr>
            )}
            {filtrados.map((p) => {
              const stockBajo =
                Number(p.stockTotal) <= Number(p.stockMinimo) && Number(p.stockMinimo) > 0
              return (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.codigo}</td>
                  <td className="px-4 py-3 font-medium">{p.nombre}</td>
                  <td className="px-4 py-3 text-slate-600">{p.categoria.nombre}</td>
                  <td className="px-4 py-3">
                    <span className="bg-slate-100 text-slate-600 text-xs font-mono px-2 py-0.5 rounded">
                      {p.unidadBase.abreviatura}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={stockBajo ? "text-red-600 font-semibold" : ""}>
                      {Number(p.stockTotal).toFixed(2)}
                    </span>
                    {stockBajo && (
                      <span className="ml-1 text-xs text-red-500">⚠</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatPrecio(p.precioVenta)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={p.activo ? "default" : "secondary"}>
                      {p.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right space-x-1">
                    <Link
                      href={`/productos/${p.id}/editar`}
                      className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                    >
                      <Pencil className="w-4 h-4" />
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleActivo(p)}
                      disabled={isPending}
                      title={p.activo ? "Desactivar" : "Activar"}
                    >
                      <Power
                        className={`w-4 h-4 ${p.activo ? "text-green-600" : "text-slate-400"}`}
                      />
                    </Button>
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
