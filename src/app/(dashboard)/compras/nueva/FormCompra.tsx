"use client"

import { useRouter } from "next/navigation"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useTransition, useState, useEffect } from "react"
import { toast } from "sonner"
import { Plus, Trash2, CalendarClock } from "lucide-react"
import type { UnidadMedida } from "@prisma/client"
import { CondicionCompra } from "@prisma/client"
import {
  compraSchema,
  type CompraInput,
  etiquetasTipoComprobante,
  ALICUOTAS_IVA,
  type AlicuotaIVA,
} from "@/lib/validaciones/compras"
import { TipoComprobanteCompra } from "@prisma/client"
import { crearCompra } from "@/server/actions/compras"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { formatearPesos } from "@/lib/utils"
import { ImportarFactura, type DatosImportados } from "./ImportarFactura"

type Proveedor = { id: string; nombreRazonSocial: string; cuit?: string | null }

type ProductoConUnidad = {
  id: string
  nombre: string
  codigo: string
  controlaVencimiento: boolean
  unidadBase: { id: string; nombre: string; abreviatura: string }
}

interface Props {
  proveedores: Proveedor[]
  productos: ProductoConUnidad[]
  unidades: UnidadMedida[]
}

const selectCls = cn(
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm",
  "outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
  "disabled:opacity-50"
)

const $ar = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n)

export function FormCompra({ proveedores, productos, unidades }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [ivaAlicuota, setIvaAlicuota] = useState<AlicuotaIVA>(0)

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
      iva: 0,
      detalles: [{ productoId: "", unidadId: "", cantidad: 0, precioUnitario: 0, numeroLote: "", fechaVencimiento: "" }],
    },
  })

  const { fields, append, remove, replace } = useFieldArray({ control, name: "detalles" })
  const detalles = watch("detalles")

  const subtotal  = detalles.reduce(
    (acc, d) => acc + (Number(d.cantidad) || 0) * (Number(d.precioUnitario) || 0),
    0
  )
  const descuento = Number(watch("descuento")) || 0

  // Calcular monto de IVA desde la alícuota seleccionada
  const ivaMonto = Math.round(subtotal * ivaAlicuota) / 100
  const total    = subtotal + ivaMonto - descuento

  // Sincronizar el campo "iva" del formulario con el monto calculado
  useEffect(() => {
    setValue("iva", ivaMonto)
  }, [ivaMonto, setValue])

  // ── Aplicar datos importados desde IA ──────────────────────────────────────
  function handleImportar(datos: DatosImportados) {
    setValue("proveedorId", datos.proveedorId)
    setValue("condicion", datos.condicion)
    if (datos.tipoComprobante) setValue("tipoComprobante", datos.tipoComprobante as TipoComprobanteCompra)
    setValue("numeroComprobante", datos.numeroComprobante)
    setValue("descuento", datos.descuento)
    setIvaAlicuota(datos.ivaAlicuota)   // el useEffect sincroniza el monto
    replace(
      datos.detalles.map((d) => ({
        productoId: d.productoId,
        unidadId: d.unidadId,
        cantidad: d.cantidad,
        precioUnitario: d.precioUnitario,
        numeroLote: "",
        fechaVencimiento: "",
      }))
    )
  }

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
    <div className="space-y-6">
      {/* Importación IA */}
      <ImportarFactura
        proveedores={proveedores}
        productos={productos}
        onAplicar={handleImportar}
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Cabecera */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Datos de la compra</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="proveedorId">Proveedor *</Label>
              <select id="proveedorId" className={selectCls} {...register("proveedorId")}>
                <option value="">Seleccioná un proveedor</option>
                {proveedores.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombreRazonSocial}</option>
                ))}
              </select>
              {errors.proveedorId && (
                <p className="text-xs text-destructive">{errors.proveedorId.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="condicion">Condición de pago *</Label>
              <select id="condicion" className={selectCls} {...register("condicion")}>
                <option value="CONTADO">Contado</option>
                <option value="CUENTA_CORRIENTE">Cuenta Corriente</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="tipoComprobante">Tipo de comprobante</Label>
              <select id="tipoComprobante" className={selectCls} {...register("tipoComprobante")}>
                <option value="">— seleccioná —</option>
                {Object.entries(etiquetasTipoComprobante).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="numeroComprobante">N° Comprobante</Label>
              <Input id="numeroComprobante" placeholder="ej: 0001-00002345" {...register("numeroComprobante")} />
            </div>

            {/* IVA — alícuota ARCA */}
            <div className="space-y-1">
              <Label htmlFor="ivaAlicuota">Alícuota IVA</Label>
              <select
                id="ivaAlicuota"
                className={selectCls}
                value={ivaAlicuota}
                onChange={(e) => setIvaAlicuota(Number(e.target.value) as AlicuotaIVA)}
              >
                {ALICUOTAS_IVA.map((a) => (
                  <option key={a.valor} value={a.valor}>{a.label}</option>
                ))}
              </select>
              {ivaAlicuota > 0 && (
                <p className="text-xs text-blue-600">
                  IVA calculado: {formatearPesos(ivaMonto)}
                </p>
              )}
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
              onClick={() => append({ productoId: "", unidadId: "", cantidad: 0, precioUnitario: 0, numeroLote: "", fechaVencimiento: "" })}
            >
              <Plus className="w-4 h-4 mr-1" />
              Agregar fila
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {errors.detalles?.root && (
              <p className="text-xs text-destructive">{errors.detalles.root.message}</p>
            )}

            {fields.map((field, i) => {
              const productoSeleccionado = productos.find((p) => p.id === detalles[i]?.productoId)
              const requiereLote = productoSeleccionado?.controlaVencimiento === true
              const subtotalFila = (Number(detalles[i]?.cantidad) || 0) * (Number(detalles[i]?.precioUnitario) || 0)

              return (
                <div key={field.id} className="space-y-2 border rounded-lg p-3 bg-muted/20">
                  {/* Fila principal */}
                  <div className="grid grid-cols-[1fr_140px_90px_110px_32px] gap-2 items-start">
                    {/* Producto */}
                    <div>
                      <select
                        className={selectCls}
                        {...register(`detalles.${i}.productoId`)}
                        onChange={(e) => {
                          register(`detalles.${i}.productoId`).onChange(e)
                          const prod = productos.find((p) => p.id === e.target.value)
                          if (prod) setValue(`detalles.${i}.unidadId`, prod.unidadBase.id)
                          setValue(`detalles.${i}.numeroLote`, "")
                          setValue(`detalles.${i}.fechaVencimiento`, "")
                        }}
                      >
                        <option value="">Seleccioná producto...</option>
                        {productos.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nombre}{p.controlaVencimiento ? " 📅" : ""}
                          </option>
                        ))}
                      </select>
                      {errors.detalles?.[i]?.productoId && (
                        <p className="text-xs text-destructive mt-0.5">{errors.detalles[i].productoId?.message}</p>
                      )}
                    </div>

                    {/* Unidad */}
                    <select
                      className={selectCls}
                      {...register(`detalles.${i}.unidadId`)}
                    >
                      <option value="">Unidad</option>
                      {productoSeleccionado && (
                        <option value={productoSeleccionado.unidadBase.id}>
                          {productoSeleccionado.unidadBase.nombre} (base)
                        </option>
                      )}
                      {unidades
                        .filter((u) => u.id !== productoSeleccionado?.unidadBase.id)
                        .map((u) => (
                          <option key={u.id} value={u.id}>{u.nombre}</option>
                        ))}
                    </select>

                    {/* Cantidad */}
                    <Input
                      type="number" step="0.001" min="0"
                      className="h-8 text-xs"
                      placeholder="0"
                      {...register(`detalles.${i}.cantidad`, { valueAsNumber: true })}
                    />

                    {/* Precio */}
                    <div>
                      <Input
                        type="number" step="0.01" min="0"
                        className="h-8 text-xs"
                        placeholder="0.00"
                        {...register(`detalles.${i}.precioUnitario`, { valueAsNumber: true })}
                      />
                      {subtotalFila > 0 && (
                        <p className="text-xs text-slate-400 mt-0.5 text-right">{$ar(subtotalFila)}</p>
                      )}
                    </div>

                    {/* Eliminar */}
                    <Button
                      type="button" variant="ghost" size="sm"
                      className="h-8 w-8 p-0 text-slate-400 hover:text-red-500"
                      onClick={() => remove(i)}
                      disabled={fields.length === 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Fila de lote */}
                  {requiereLote && (
                    <div className="grid grid-cols-[1fr_1fr] gap-2 pt-1 border-t border-dashed">
                      <div className="space-y-1">
                        <Label className="text-xs flex items-center gap-1 text-amber-700">
                          <CalendarClock className="h-3 w-3" />
                          N° Lote (opcional)
                        </Label>
                        <Input
                          className="h-7 text-xs"
                          placeholder="ej: L2024-001"
                          {...register(`detalles.${i}.numeroLote`)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs flex items-center gap-1 text-amber-700">
                          <CalendarClock className="h-3 w-3" />
                          Fecha de vencimiento
                        </Label>
                        <Input
                          type="date"
                          className="h-7 text-xs"
                          {...register(`detalles.${i}.fechaVencimiento`)}
                        />
                      </div>
                    </div>
                  )}
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
                <span className="text-slate-500">Subtotal (neto)</span>
                <span className="font-medium w-32 text-right">{$ar(subtotal)}</span>
              </div>
              {ivaMonto > 0 && (
                <div className="flex gap-8">
                  <span className="text-blue-600">IVA ({ivaAlicuota}%)</span>
                  <span className="font-medium w-32 text-right text-blue-600">{$ar(ivaMonto)}</span>
                </div>
              )}
              <div className="flex items-center gap-8">
                <span className="text-slate-500">Descuento</span>
                <Input
                  type="number" step="0.01" min="0"
                  className="h-7 w-32 text-right text-sm"
                  {...register("descuento", { valueAsNumber: true })}
                />
              </div>
              <div className="flex gap-8 pt-2 border-t">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-lg w-32 text-right">{$ar(total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => router.push("/compras")}>Cancelar</Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Registrando..." : "Registrar compra"}
          </Button>
        </div>
      </form>
    </div>
  )
}
