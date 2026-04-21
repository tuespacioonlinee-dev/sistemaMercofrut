"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Pencil, Plus, Power } from "lucide-react"
import type { UnidadMedida } from "@prisma/client"
import { unidadSchema, type UnidadInput } from "@/lib/validaciones/unidades"
import { crearUnidad, editarUnidad, toggleUnidadActiva } from "@/server/actions/unidades"
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

interface Props {
  unidades: UnidadMedida[]
}

export function UnidadesList({ unidades }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando] = useState<UnidadMedida | null>(null)
  const [isPending, startTransition] = useTransition()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UnidadInput>({ resolver: zodResolver(unidadSchema) })

  function abrirNuevo() {
    setEditando(null)
    reset({ nombre: "", abreviatura: "" })
    setDialogOpen(true)
  }

  function abrirEditar(u: UnidadMedida) {
    setEditando(u)
    reset({ nombre: u.nombre, abreviatura: u.abreviatura })
    setDialogOpen(true)
  }

  function onSubmit(data: UnidadInput) {
    startTransition(async () => {
      const res = editando
        ? await editarUnidad(editando.id, data)
        : await crearUnidad(data)

      if (res.error) {
        toast.error(res.error)
        return
      }

      toast.success(editando ? "Unidad actualizada" : "Unidad creada")
      setDialogOpen(false)
    })
  }

  function toggleActiva(u: UnidadMedida) {
    startTransition(async () => {
      await toggleUnidadActiva(u.id, !u.activa)
      toast.success(u.activa ? "Unidad desactivada" : "Unidad activada")
    })
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={abrirNuevo}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva unidad
        </Button>
      </div>

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Nombre</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Abreviatura</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Estado</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {unidades.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-8 text-slate-400">
                  No hay unidades todavía. Creá la primera.
                </td>
              </tr>
            )}
            {unidades.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{u.nombre}</td>
                <td className="px-4 py-3">
                  <span className="bg-slate-100 text-slate-600 text-xs font-mono px-2 py-0.5 rounded">
                    {u.abreviatura}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={u.activa ? "default" : "secondary"}>
                    {u.activa ? "Activa" : "Inactiva"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => abrirEditar(u)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleActiva(u)}
                    disabled={isPending}
                    title={u.activa ? "Desactivar" : "Activar"}
                  >
                    <Power className={`w-4 h-4 ${u.activa ? "text-green-600" : "text-slate-400"}`} />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar unidad" : "Nueva unidad de medida"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="nombre">Nombre</Label>
              <Input id="nombre" placeholder="ej: Kilogramo" {...register("nombre")} autoFocus />
              {errors.nombre && (
                <p className="text-xs text-destructive">{errors.nombre.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="abreviatura">Abreviatura</Label>
              <Input id="abreviatura" placeholder="ej: kg" {...register("abreviatura")} />
              {errors.abreviatura && (
                <p className="text-xs text-destructive">{errors.abreviatura.message}</p>
              )}
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
