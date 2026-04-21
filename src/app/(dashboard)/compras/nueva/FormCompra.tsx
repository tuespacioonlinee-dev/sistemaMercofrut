"use client"

import { useRouter } from "next/navigation"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useTransition, useState } from "react"
import { toast } from "sonner"
import { Plus, Trash2 } from "lucide-react"
import type { Proveedor, UnidadMedida } from "@prisma/client"
import { CondicionCompra } from "@prisma/client"
import { compraSchema, type CompraInput } from "@/lib/validaciones/compras"
import { crearCompra } from "@/server/actions/compras"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type ProductoConUnidad = {
  id: string
  nombre: string
  codigo: string
  unidadBase: { id: string; nombre: string; abreviatura: string }
}

interface Props {
  proveedores: Proveedor[]
  productos: ProductoConUnidad[]
  unidades: UnidadMedida[]
}

export function FormCompra({ proveedores, productos, unidades }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CompraInput>({
    resolver: zodResolver(compraSchema),
    defaultValues: {
      condicion: CondicionCompra.CONTADO,
      descuento: 0,
      detalles: [{ productoId: "", unidadId: "", cantidad: 0, precioUnitario: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: "detalles" })
  const detalles = watch("detalles")

  const subtotal = detalles.reduce(
    (acc, d) => acc + (Number(d.cantidad) || 0) * (Number(d.precioUnitario) || 0),
    0
  )
  const descuento = Number(watch("descuento")) || 0
  const total = subtotal - descuento

  function onSubmit(data: CompraInput) {
    startTransition(async () => {
      const res = await crearCompra(data)
      if (res.error) {
        toast.error(res.error)
        return
      }
      toast.success("Compra registrada. Stock actualizado.")
      router.push("/compras")
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Cabecera */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos de la compra</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Proveedor *</Label>
            <Select onValueChange={(v: string | null) => { if (v) setValue("proveedorId", v) }}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccioná un proveedor" />
              </SelectTrigger>
              <SelectContent>
                {proveedores.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nombreRazonSocial}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.proveedorId && (
              <p className="text-xs text-destructive">{errors.proveedorId.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label>Condición de pago *</Label>
            <Select
              defaultValue={CondicionCompra.CONTADO}
              onValueChange={(v: string | null) => {
                if (v) setValue("condicion", v as CondicionCompra)
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CONTADO">Contado</SelectItem>
                <SelectItem value="CUENTA_CORRIENTE">Cuenta Corriente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="numeroComprobante">N° Comprobante (opcional)</Label>
            <Input
              id="numeroComprobante"
              placeholder="ej: 0001-00002345"
              {...register("numeroComprobante")}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="observaciones">Observaciones</Label>
            <Input id="observaciones" {...register("observaciones")} />
          </div>
        </CardContent>
      </Card>

      {/* Detalle de productos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Productos</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ productoId: "", unidadId: "", cantidad: 0, precioUnitario: 0 })}
          >
            <Plus className="w-4 h-4 mr-1" />
            Agregar fila
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {errors.detalles?.root && (
            <p className="text-xs text-destructive">{errors.detalles.root.message}</p>
          )}

          <div className="grid grid-cols-[1fr_140px_100px_120px_36px] gap-2 text-xs font-medium text-slate-500 px-1">
            <span>Producto</span>
            <span>Unidad</span>
            <span>Cantidad</span>
            <span>Precio unit.</span>
            <span />
          </div>

          {fields.map((field, i) => {
            const productoSeleccionado = productos.find(
              (p) => p.id === detalles[i]?.productoId
            )
            const subtotalFila =
              (Number(detalles[i]?.cantidad) || 0) *
              (Number(detalles[i]?.precioUnitario) || 0)

            return (
              <div key={field.id} className="grid grid-cols-[1fr_140px_100px_120px_36px] gap-2 items-start">
                {/* Producto */}
                <div>
                  <Select
                    onValueChange={(v: string | null) => {
                      if (!v) return
                      setValue(`detalles.${i}.productoId`, v)
                      const prod = productos.find((p) => p.id === v)
                      if (prod) setValue(`detalles.${i}.unidadId`, prod.unidadBase.id)
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Seleccioná..." />
                    </SelectTrigger>
                    <SelectContent>
                      {productos.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.detalles?.[i]?.productoId && (
                    <p className="text-xs text-destructive mt-0.5">
                      {errors.detalles[i].productoId?.message}
                    </p>
                  )}
                </div>

                {/* Unidad */}
                <div>
                  <Select
                    value={detalles[i]?.unidadId || ""}
                    onValueChange={(v: string | null) => {
                      if (v) setValue(`detalles.${i}.unidadId`, v)
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Unidad" />
                    </SelectTrigger>
                    <SelectContent>
                      {productoSeleccionado && (
                        <SelectItem value={productoSeleccionado.unidadBase.id}>
                          {productoSeleccionado.unidadBase.nombre} (base)
                        </SelectItem>
                      )}
                      {unidades
                        .filter((u) => u.id !== productoSeleccionado?.unidadBase.id)
                        .map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.nombre}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Cantidad */}
                <Input
                  type="number"
                  step="0.001"
                  min="0"
                  className="h-8 text-xs"
                  {...register(`detalles.${i}.cantidad`, { valueAsNumber: true })}
                />

                {/* Precio unitario */}
                <div>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    className="h-8 text-xs"
                    {...register(`detalles.${i}.precioUnitario`, { valueAsNumber: true })}
                  />
                  {subtotalFila > 0 && (
                    <p className="text-xs text-slate-400 mt-0.5 text-right">
                      {new Intl.NumberFormat("es-AR", {
                        style: "currency",
                        currency: "ARS",
                      }).format(subtotalFila)}
                    </p>
                  )}
                </div>

                {/* Eliminar fila */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-slate-400 hover:text-red-500"
                  onClick={() => remove(i)}
                  disabled={fields.length === 1}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Totales */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-end gap-2 text-sm">
            <div className="flex gap-8">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-medium w-32 text-right">
                {new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(subtotal)}
              </span>
            </div>
            <div className="flex items-center gap-8">
              <span className="text-slate-500">Descuento</span>
              <Input
                type="number"
                step="0.01"
                min="0"
                className="h-7 w-32 text-right text-sm"
                {...register("descuento", { valueAsNumber: true })}
              />
            </div>
            <div className="flex gap-8 pt-2 border-t">
              <span className="font-semibold">Total</span>
              <span className="font-bold text-lg w-32 text-right">
                {new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(total)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={() => router.push("/compras")}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Registrando..." : "Registrar compra"}
        </Button>
      </div>
    </form>
  )
}
