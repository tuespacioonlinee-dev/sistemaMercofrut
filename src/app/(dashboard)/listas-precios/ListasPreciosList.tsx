"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Pencil, Plus, Power, Star } from "lucide-react"
import {
  listaPrecioSchema,
  type ListaPrecioInput,
} from "@/lib/validaciones/listas-precios"
import {
  crearListaPrecio,
  editarListaPrecio,
  toggleListaPrecioActiva,
} from "@/server/actions/listas-precios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

type ListaItem = {
  id:          string
  nombre:      string
  descripcion: string | null
  activa:      boolean
  esDefault:   boolean
  _count: { precios: number; clientes: number }
}

interface Props {
  listas: ListaItem[]
}

export function ListasPreciosList({ listas }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando]     = useState<ListaItem | null>(null)
  const [isPending, startTransition] = useTransition()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ListaPrecioInput>({ resolver: zodResolver(listaPrecioSchema) })

  function abrirNueva() {
    setEditando(null)
    reset({ nombre: "", descripcion: "", esDefault: false })
    setDialogOpen(true)
  }

  function abrirEditar(lista: ListaItem) {
    setEditando(lista)
    reset({
      nombre:      lista.nombre,
      descripcion: lista.descripcion ?? "",
      esDefault:   lista.esDefault,
    })
    setDialogOpen(true)
  }

  function onSubmit(data: ListaPrecioInput) {
    startTransition(async () => {
      const res = editando
        ? await editarListaPrecio(editando.id, data)
        : await crearListaPrecio(data)

      if (res.error) {
        toast.error(res.error)
        return
      }

      toast.success(editando ? "Lista actualizada" : "Lista creada")
      setDialogOpen(false)
    })
  }

  function toggleActiva(lista: ListaItem) {
    startTransition(async () => {
      await toggleListaPrecioActiva(lista.id, !lista.activa)
      toast.success(lista.activa ? "Lista desactivada" : "Lista activada")
    })
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={abrirNueva}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva lista
        </Button>
      </div>

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Nombre</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Descripción</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Productos</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Clientes</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Estado</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {listas.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-8 text-slate-400">
                  No hay listas todavía. Creá la primera (ej: &quot;Mayorista&quot;, &quot;Minorista&quot;).
                </td>
              </tr>
            )}
            {listas.map((lista) => (
              <tr key={lista.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">
                  <div className="flex items-center gap-2">
                    {lista.esDefault && <Star className="h-4 w-4 text-amber-500 fill-amber-500" />}
                    {lista.nombre}
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-500">{lista.descripcion ?? "—"}</td>
                <td className="px-4 py-3 text-right tabular-nums">{lista._count.precios}</td>
                <td className="px-4 py-3 text-right tabular-nums">{lista._count.clientes}</td>
                <td className="px-4 py-3">
                  <Badge variant={lista.activa ? "default" : "secondary"}>
                    {lista.activa ? "Activa" : "Inactiva"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => abrirEditar(lista)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleActiva(lista)}
                    disabled={isPending}
                    title={lista.activa ? "Desactivar" : "Activar"}
                  >
                    <Power className={`w-4 h-4 ${lista.activa ? "text-green-600" : "text-slate-400"}`} />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar lista" : "Nueva lista de precios"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="nombre">Nombre</Label>
              <Input id="nombre" {...register("nombre")} autoFocus placeholder="Mayorista, Minorista, Especial..." />
              {errors.nombre && (
                <p className="text-xs text-destructive">{errors.nombre.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="descripcion">Descripción (opcional)</Label>
              <Input id="descripcion" {...register("descripcion")} placeholder="Para revendedores con CUIT" />
              {errors.descripcion && (
                <p className="text-xs text-destructive">{errors.descripcion.message}</p>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                id="esDefault"
                type="checkbox"
                {...register("esDefault")}
                className="h-4 w-4 rounded border-slate-300"
              />
              <Label htmlFor="esDefault" className="text-sm cursor-pointer">
                Lista predeterminada (se usa para clientes sin lista asignada)
              </Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
