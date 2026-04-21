"use client"

import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useTransition } from "react"
import { toast } from "sonner"
import type { Categoria, UnidadMedida, Producto } from "@prisma/client"
import { productoSchema, type ProductoInput } from "@/lib/validaciones/productos"
import { crearProducto, editarProducto } from "@/server/actions/productos"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const selectClasses = cn(
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm",
  "outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
  "disabled:opacity-50"
)

interface Props {
  categorias: Categoria[]
  unidades: UnidadMedida[]
  producto?: Producto
}

export function FormProducto({ categorias, unidades, producto }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProductoInput>({ // setValue se sigue usando para el Checkbox
    resolver: zodResolver(productoSchema),
    defaultValues: producto
      ? {
          codigo: producto.codigo,
          nombre: producto.nombre,
          categoriaId: producto.categoriaId,
          unidadBaseId: producto.unidadBaseId,
          precioVenta: Number(producto.precioVenta),
          precioCompra: Number(producto.precioCompra),
          stockMinimo: Number(producto.stockMinimo),
          controlaVencimiento: producto.controlaVencimiento,
        }
      : {
          precioCompra: 0,
          stockMinimo: 0,
          controlaVencimiento: false,
        },
  })

  const controlaVencimiento = watch("controlaVencimiento")

  function onSubmit(data: ProductoInput) {
    startTransition(async () => {
      const res = producto
        ? await editarProducto(producto.id, data)
        : await crearProducto(data)

      if (res.error) {
        toast.error(res.error)
        return
      }

      toast.success(producto ? "Producto actualizado" : "Producto creado")
      router.push("/productos")
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardContent className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Código */}
          <div className="space-y-1">
            <Label htmlFor="codigo">Código *</Label>
            <Input id="codigo" placeholder="ej: MAN-001" {...register("codigo")} />
            {errors.codigo && (
              <p className="text-xs text-destructive">{errors.codigo.message}</p>
            )}
          </div>

          {/* Nombre */}
          <div className="space-y-1">
            <Label htmlFor="nombre">Nombre *</Label>
            <Input id="nombre" placeholder="ej: Manzana Red" {...register("nombre")} />
            {errors.nombre && (
              <p className="text-xs text-destructive">{errors.nombre.message}</p>
            )}
          </div>

          {/* Categoría */}
          <div className="space-y-1">
            <Label htmlFor="categoriaId">Categoría *</Label>
            <select id="categoriaId" className={selectClasses} {...register("categoriaId")}>
              <option value="">Seleccioná una categoría</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
            {errors.categoriaId && (
              <p className="text-xs text-destructive">{errors.categoriaId.message}</p>
            )}
          </div>

          {/* Unidad base */}
          <div className="space-y-1">
            <Label htmlFor="unidadBaseId">Unidad base *</Label>
            <select id="unidadBaseId" className={selectClasses} {...register("unidadBaseId")}>
              <option value="">Seleccioná una unidad</option>
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>{u.nombre} ({u.abreviatura})</option>
              ))}
            </select>
            {errors.unidadBaseId && (
              <p className="text-xs text-destructive">{errors.unidadBaseId.message}</p>
            )}
          </div>

          {/* Precio de venta */}
          <div className="space-y-1">
            <Label htmlFor="precioVenta">Precio de venta *</Label>
            <Input
              id="precioVenta"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              {...register("precioVenta", { valueAsNumber: true })}
            />
            {errors.precioVenta && (
              <p className="text-xs text-destructive">{errors.precioVenta.message}</p>
            )}
          </div>

          {/* Precio de compra */}
          <div className="space-y-1">
            <Label htmlFor="precioCompra">Precio de compra</Label>
            <Input
              id="precioCompra"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              {...register("precioCompra", { valueAsNumber: true })}
            />
          </div>

          {/* Stock mínimo */}
          <div className="space-y-1">
            <Label htmlFor="stockMinimo">Stock mínimo</Label>
            <Input
              id="stockMinimo"
              type="number"
              step="0.001"
              min="0"
              placeholder="0"
              {...register("stockMinimo", { valueAsNumber: true })}
            />
            <p className="text-xs text-slate-400">
              Se mostrará alerta cuando el stock baje de este valor
            </p>
          </div>

          {/* Controla vencimiento */}
          <div className="flex items-start gap-3 pt-6">
            <Checkbox
              id="controlaVencimiento"
              checked={controlaVencimiento}
              onCheckedChange={(v) => setValue("controlaVencimiento", v === true)}
            />
            <div>
              <Label htmlFor="controlaVencimiento" className="cursor-pointer">
                Controla vencimiento
              </Label>
              <p className="text-xs text-slate-400">
                Activá para registrar fecha de vencimiento por lote
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={() => router.push("/productos")}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Guardando..." : producto ? "Guardar cambios" : "Crear producto"}
        </Button>
      </div>
    </form>
  )
}
