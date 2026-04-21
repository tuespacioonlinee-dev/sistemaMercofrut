"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Pencil, Power, Search } from "lucide-react"
import type { Proveedor } from "@prisma/client"
import { toggleProveedorActivo } from "@/server/actions/proveedores"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

interface Props {
  proveedores: Proveedor[]
}

export function ProveedoresTable({ proveedores }: Props) {
  const [busqueda, setBusqueda] = useState("")
  const [isPending, startTransition] = useTransition()

  const filtrados = proveedores.filter(
    (p) =>
      p.nombreRazonSocial.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.documento.includes(busqueda)
  )

  function toggleActivo(p: Proveedor) {
    startTransition(async () => {
      await toggleProveedorActivo(p.id, !p.activo)
      toast.success(p.activo ? "Proveedor desactivado" : "Proveedor activado")
    })
  }

  return (
    <div className="space-y-3">
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Buscar por nombre o documento..."
          className="pl-9"
          value={busqueda}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBusqueda(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Razón Social</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Documento</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Teléfono</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Localidad</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Estado</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-10 text-slate-400">
                  {busqueda ? "Sin resultados." : "No hay proveedores todavía."}
                </td>
              </tr>
            )}
            {filtrados.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{p.nombreRazonSocial}</td>
                <td className="px-4 py-3 text-slate-500">
                  <span className="text-xs text-slate-400">{p.tipoDocumento} </span>
                  {p.documento}
                </td>
                <td className="px-4 py-3 text-slate-500">{p.telefono ?? "—"}</td>
                <td className="px-4 py-3 text-slate-500">{p.localidad ?? "—"}</td>
                <td className="px-4 py-3">
                  <Badge variant={p.activo ? "default" : "secondary"}>
                    {p.activo ? "Activo" : "Inactivo"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right space-x-1">
                  <Link
                    href={`/proveedores/${p.id}/editar`}
                    className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                  >
                    <Pencil className="w-4 h-4" />
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleActivo(p)}
                    disabled={isPending}
                  >
                    <Power className={`w-4 h-4 ${p.activo ? "text-green-600" : "text-slate-400"}`} />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
