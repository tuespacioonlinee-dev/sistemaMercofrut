"use client"

import { useRouter } from "next/navigation"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { toast } from "sonner"
import { PlusCircle, Trash2, AlertTriangle } from "lucide-react"
import { useQuery } from "@tanstack/react-query"

import { ventaSchema, VentaInput } from "@/lib/validaciones/ventas"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { formatearPesos, cn } from "@/lib/utils"

// ─── Tipos mínimos de los datos que recibe el formulario ─────────────────────

interface Cliente { id: string; nombreRazonSocial: string; documento: string }
interface Unidad  { id: string; nombre: string; abreviatura: string }
interface ProductoUnidadAlternativa { unidadId: string; factor: unknown; unidad: Unidad }
interface Producto {
  id: string
  nombre: string
  codigo: string
  precioVenta: number
  stockTotal:  number
  unidadBase: Unidad
  unidadesAlternativas: ProductoUnidadAlternativa[]
}

interface Props {
  clientes:  Cliente[]
  productos: Producto[]
  unidades:  Unidad[]
  onSubmit:  (data: VentaInput) => Promise<{
    ok?:           boolean
    error?:        string
    ventaId?:      string
    remitoId?:     string
    remitoNumero?: string
  }>
}

// ─── Helpers de estilo ────────────────────────────────────────────────────────

const selectClasses = cn(
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm",
  "outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
  "disabled:opacity-50"
)

// ─── Componente ───────────────────────────────────────────────────────────────

export function FormVenta({ clientes, productos, onSubmit }: Props) {
  const router    = useRouter()
  const [guardando, setGuardando] = useState(false)

  // Stock en tiempo real — se refresca cada 30 s automáticamente
  const { data: stockActual } = useQuery<Record<string, number>>({
    queryKey: ["stock"],
    queryFn:  () => fetch("/api/stock").then((r) => r.json()),
    initialData: Object.fromEntries(productos.map((p) => [p.id, p.stockTotal])),
    refetchInterval: 30_000, // 30 segundos
    staleTime:        10_000, // 10 segundos
  })

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<VentaInput>({
    resolver: zodResolver(ventaSchema),
    defaultValues: {
      condicion: "CONTADO" as const,
      descuento: 0,
      detalles: [{ productoId: "", unidadId: "", cantidad: 1, precioUnitario: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: "detalles" })
  const detalles  = watch("detalles")
  const descuento = watch("descuento") ?? 0

  // Calcular totales en tiempo real
  const subtotal = detalles.reduce((acc, d) => {
    const cant  = Number(d.cantidad)  || 0
    const precio = Number(d.precioUnitario) || 0
    return acc + cant * precio
  }, 0)
  const total = subtotal - (Number(descuento) || 0)

  // Cuando se elige un producto, auto-completar precio y unidad base
  function onProductoChange(index: number, productoId: string) {
    const producto = productos.find((p) => p.id === productoId)
    if (!producto) return
    setValue(`detalles.${index}.precioUnitario`, Number(producto.precioVenta))
    setValue(`detalles.${index}.unidadId`, producto.unidadBase.id)
  }

  // Obtener las unidades disponibles para un producto dado
  function getUnidadesProducto(productoId: string): Unidad[] {
    const producto = productos.find((p) => p.id === productoId)
    if (!producto) return []
    return [producto.unidadBase, ...producto.unidadesAlternativas.map((u) => u.unidad)]
  }

  // ── Enviar formulario ──────────────────────────────────────────────────────
  async function procesarEnvio(data: VentaInput) {
    setGuardando(true)
    const resultado = await onSubmit(data)
    setGuardando(false)

    if (resultado.error) {
      toast.error(resultado.error)
      return
    }

    toast.success(
      resultado.remitoNumero
        ? `Venta registrada. Remito ${resultado.remitoNumero} generado.`
        : "Venta registrada correctamente."
    )

    // CAMBIO 2: redirigir a la vista del remito para imprimir/descargar
    if (resultado.remitoId) {
      router.push(`/remitos/${resultado.remitoId}`)
    } else {
      router.push("/ventas")
    }
  }

  return (
    <form onSubmit={handleSubmit(procesarEnvio)} className="space-y-6">
      {/* ── Datos generales ─────────────────────────────────────────────── */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold">Datos de la venta</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="clienteId">Cliente *</Label>
            <select id="clienteId" className={selectClasses} {...register("clienteId")}>
              <option value="">Seleccioná un cliente...</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombreRazonSocial} — {c.documento}
                </option>
              ))}
            </select>
            {errors.clienteId && (
              <p className="text-sm text-destructive">{errors.clienteId.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="condicion">Condición de venta *</Label>
            <select id="condicion" className={selectClasses} {...register("condicion")}>
              <option value="CONTADO">Contado</option>
              <option value="CUENTA_CORRIENTE">Cuenta Corriente</option>
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="observaciones">Observaciones</Label>
          <Input
            id="observaciones"
            placeholder="Notas sobre esta venta..."
            {...register("observaciones")}
          />
        </div>
      </div>

      <Separator />

      {/* ── Ítems ───────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Productos</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ productoId: "", unidadId: "", cantidad: 1, precioUnitario: 0 })}
          >
            <PlusCircle className="h-4 w-4 mr-1" />
            Agregar producto
          </Button>
        </div>

        {errors.detalles && !Array.isArray(errors.detalles) && (
          <p className="text-sm text-destructive">{errors.detalles.message}</p>
        )}

        <div className="space-y-2">
          {/* Encabezado de columnas */}
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 px-2">
            <span className="text-xs font-semibold text-muted-foreground">Producto</span>
            <span className="text-xs font-semibold text-muted-foreground">Unidad</span>
            <span className="text-xs font-semibold text-muted-foreground">Cantidad</span>
            <span className="text-xs font-semibold text-muted-foreground">Precio unit.</span>
            <span />
          </div>

          {fields.map((field, index) => {
            const productoId = watch(`detalles.${index}.productoId`)
            const cantidad   = Number(watch(`detalles.${index}.cantidad`)) || 0
            const precio     = Number(watch(`detalles.${index}.precioUnitario`)) || 0
            const unidades   = getUnidadesProducto(productoId)
            const subtotalItem = cantidad * precio

            // CAMBIO 3: stock en tiempo real con advertencia ámbar
            const stockDisponible = productoId ? (stockActual?.[productoId] ?? null) : null
            const sinStock        = stockDisponible !== null && stockDisponible === 0
            const stockExcedido   = stockDisponible !== null && cantidad > stockDisponible

            return (
              <div key={field.id} className="space-y-1">
                <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 items-start">
                  {/* Producto */}
                  <div className="space-y-1">
                    <select
                      className={selectClasses}
                      {...register(`detalles.${index}.productoId`)}
                      onChange={(e) => {
                        register(`detalles.${index}.productoId`).onChange(e)
                        onProductoChange(index, e.target.value)
                      }}
                    >
                      <option value="">Elegir producto...</option>
                      {productos.map((p) => {
                        const stock = stockActual?.[p.id] ?? p.stockTotal
                        return (
                          <option key={p.id} value={p.id}>
                            {p.nombre} — Stock: {stock.toFixed(0)}
                          </option>
                        )
                      })}
                    </select>
                    {errors.detalles?.[index]?.productoId && (
                      <p className="text-xs text-destructive">
                        {errors.detalles[index]?.productoId?.message}
                      </p>
                    )}
                  </div>

                  {/* Unidad */}
                  <div>
                    <select
                      className={selectClasses}
                      {...register(`detalles.${index}.unidadId`)}
                      disabled={!productoId}
                    >
                      <option value="">—</option>
                      {unidades.map((u) => (
                        <option key={u.id} value={u.id}>{u.abreviatura}</option>
                      ))}
                    </select>
                  </div>

                  {/* Cantidad */}
                  <div>
                    <Input
                      type="number"
                      step="0.001"
                      min="0.001"
                      className={cn(
                        "h-8 text-sm",
                        stockExcedido && "border-amber-400 focus-visible:border-amber-500"
                      )}
                      {...register(`detalles.${index}.cantidad`, { valueAsNumber: true })}
                    />
                  </div>

                  {/* Precio unitario */}
                  <div className="space-y-1">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      className="h-8 text-sm"
                      {...register(`detalles.${index}.precioUnitario`, { valueAsNumber: true })}
                    />
                    {subtotalItem > 0 && (
                      <p className="text-xs text-muted-foreground text-right tabular-nums">
                        {formatearPesos(subtotalItem)}
                      </p>
                    )}
                  </div>

                  {/* Eliminar */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 mt-0.5"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* CAMBIO 3: advertencia ámbar (no bloquea) */}
                {sinStock && productoId && (
                  <div className="flex items-center gap-1.5 text-amber-600 text-xs px-1">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span>Sin stock disponible. La venta igualmente puede registrarse.</span>
                  </div>
                )}
                {!sinStock && stockExcedido && stockDisponible !== null && (
                  <div className="flex items-center gap-1.5 text-amber-600 text-xs px-1">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      Cantidad supera el stock disponible ({stockDisponible.toFixed(0)} unid.). La venta
                      igualmente puede registrarse.
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <Separator />

      {/* ── Totales ─────────────────────────────────────────────────────── */}
      <div className="flex justify-end">
        <div className="w-64 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="tabular-nums">{formatearPesos(subtotal)}</span>
          </div>

          <div className="flex items-center justify-between text-sm gap-4">
            <Label htmlFor="descuento" className="text-muted-foreground whitespace-nowrap">
              Descuento ($)
            </Label>
            <Input
              id="descuento"
              type="number"
              step="0.01"
              min="0"
              className="h-7 text-sm w-28 text-right"
              {...register("descuento", { valueAsNumber: true })}
            />
          </div>

          <Separator />

          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span className="tabular-nums">{formatearPesos(total)}</span>
          </div>
        </div>
      </div>

      {/* ── Botones ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={guardando || total <= 0}>
          {guardando ? "Registrando..." : "Confirmar venta"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/ventas")}
          disabled={guardando}
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}
