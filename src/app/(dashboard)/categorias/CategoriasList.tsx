"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Pencil, Plus, Power } from "lucide-react"
import type { Categoria } from "@prisma/client"
import { categoriaSchema, type CategoriaInput } from "@/lib/validaciones/categorias"
import { crearCategoria, editarCategoria, toggleCategoriaActiva } from "@/server/actions/categorias"
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
  categorias: Categoria[]
}

export function CategoriasList({ categorias }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando] = useState<Categoria | null>(null)
  const [isPending, startTransition] = useTransition()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CategoriaInput>({ resolver: zodResolver(categoriaSchema) })

  function abrirNuevo() {
    setEditando(null)
    reset({ nombre: "" })
    setDialogOpen(true)
  }

  function abrirEditar(cat: Categoria) {
    setEditando(cat)
    reset({ nombre: cat.nombre })
    setDialogOpen(true)
  }

  function onSubmit(data: CategoriaInput) {
    startTransition(async () => {
      const res = editando
        ? await editarCategoria(editando.id, data)
        : await crearCategoria(data)

      if (res.error) {
        toast.error(res.error)
        return
      }

      toast.success(editando ? "Categoría actualizada" : "Categoría creada")
      setDialogOpen(false)
    })
  }

  function toggleActiva(cat: Categoria) {
    startTransition(async () => {
      await toggleCategoriaActiva(cat.id, !cat.activa)
      toast.success(cat.activa ? "Categoría desactivada" : "Categoría activada")
    })
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={abrirNuevo}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva categoría
        </Button>
      </div>

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Nombre</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Estado</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {categorias.length === 0 && (
              <tr>
                <td colSpan={3} className="text-center py-8 text-slate-400">
                  No hay categorías todavía. Creá la primera.
                </td>
              </tr>
            )}
            {categorias.map((cat) => (
              <tr key={cat.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{cat.nombre}</td>
                <td className="px-4 py-3">
                  <Badge variant={cat.activa ? "default" : "secondary"}>
                    {cat.activa ? "Activa" : "Inactiva"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => abrirEditar(cat)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleActiva(cat)}
                    disabled={isPending}
                    title={cat.activa ? "Desactivar" : "Activar"}
                  >
                    <Power className={`w-4 h-4 ${cat.activa ? "text-green-600" : "text-slate-400"}`} />
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
            <DialogTitle>{editando ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="nombre">Nombre</Label>
              <Input id="nombre" {...register("nombre")} autoFocus />
              {errors.nombre && (
                <p className="text-xs text-destructive">{errors.nombre.message}</p>
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
