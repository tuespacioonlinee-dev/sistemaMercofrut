"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { esquemaCrearFactura, DatosCrearFactura } from "@/lib/validaciones/facturacion"
import { crearFactura } from "@/server/actions/facturacion"
import { formatearPesos } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { Button, buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { ArrowLeft, Receipt, Package, CheckCircle2 } from "lucide-react"

interface Remito { id: string; numero: string }

interface Venta {
  id: string
  numero: number
  fecha: string
  subtotal: number
  iva: number
  totalConIva: number
  total: number
  condicion: string
  yaFacturada: boolean
  tipoFactura: "A" | "B" | "C"
  etiquetaTipo: string
  cliente: {
    nombreRazonSocial: string
    condicionIva: string
    etiquetaCondicion: string
  }
  remitosEmitidos: Remito[]
  detalles: {
    id: string
    cantidad: number
    precioUnitario: number
    subtotal: number
    producto: { nombre: string }
    unidad: { abreviatura: string }
  }[]
}

interface Props {
  ventas: Venta[]
}

const tipoBadgeClass: Record<string, string> = {
  A: "bg-blue-100 text-blue-700",
  B: "bg-purple-100 text-purple-700",
  C: "bg-teal-100 text-teal-700",
}

export function FormNuevaFactura({ ventas }: Props) {
  const router = useRouter()
  const [ventaSel, setVentaSel] = useState<Venta | null>(null)
  const [remitoSel, setRemitoSel] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<DatosCrearFactura>({
    resolver: zodResolver(esquemaCrearFactura),
  })

  function seleccionarVenta(v: Venta) {
    setVentaSel(v)
    setValue("ventaId", v.id)
    setRemitoSel("")
    setValue("remitoId", undefined)
  }

  function seleccionarRemito(id: string) {
    setRemitoSel(id)
    setValue("remitoId", id || undefined)
  }

  async function procesar(data: DatosCrearFactura) {
    setError(null)
    setLoading(true)
    const res = await crearFactura(data)
    if (res.error) {
      setError(res.error)
      setLoading(false)
      return
    }
    router.push(`/facturacion/${res.id}`)
  }

  const disponibles = ventas.filter((v) => !v.yaFacturada)
  const yaFacturadas = ventas.filter((v) => v.yaFacturada)

  return (
    <form onSubmit={handleSubmit(procesar)} className="space-y-6">
      <Link href="/facturacion" className={buttonVariants({ variant: "outline", size: "sm" })}>
        <ArrowLeft className="h-4 w-4 mr-1" />
        Volver
      </Link>

      <input type="hidden" {...register("ventaId")} />
      <input type="hidden" {...register("remitoId")} />

      {/* Ventas disponibles */}
      <div className="space-y-2">
        <Label>Venta a facturar *</Label>
        {errors.ventaId && <p className="text-xs text-destructive">{errors.ventaId.message}</p>}

        {disponibles.length === 0 && yaFacturadas.length === 0 ? (
          <div className="border rounded-lg p-8 text-center text-muted-foreground text-sm">
            No hay ventas confirmadas disponibles.
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {disponibles.map((v) => {
              const sel = ventaSel?.id === v.id
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => seleccionarVenta(v)}
                  className={cn(
                    "w-full text-left border rounded-lg p-4 transition-all hover:border-primary/60 hover:bg-muted/30",
                    sel && "border-primary bg-primary/5 ring-1 ring-primary/30"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm">
                            Venta #{v.numero} · {v.cliente.nombreRazonSocial}
                          </p>
                          <Badge className={cn("text-xs", tipoBadgeClass[v.tipoFactura])}>
                            {v.etiquetaTipo}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(v.fecha).toLocaleDateString("es-AR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}{" "}
                          · {v.condicion === "CONTADO" ? "Contado" : "Cta. cte."} ·{" "}
                          {v.cliente.etiquetaCondicion}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-sm">{formatearPesos(v.totalConIva)}</p>
                      {v.iva > 0 && (
                        <p className="text-xs text-muted-foreground">
                          + IVA {formatearPesos(v.iva)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Ítems preview */}
                  <div className="mt-2 flex flex-wrap gap-1 pl-6">
                    {v.detalles.slice(0, 3).map((d) => (
                      <Badge key={d.id} variant="secondary" className="text-xs font-normal">
                        <Package className="h-3 w-3 mr-1" />
                        {d.cantidad} {d.unidad.abreviatura} {d.producto.nombre}
                      </Badge>
                    ))}
                    {v.detalles.length > 3 && (
                      <Badge variant="secondary" className="text-xs font-normal">
                        +{v.detalles.length - 3} más
                      </Badge>
                    )}
                  </div>
                </button>
              )
            })}

            {/* Ya facturadas (deshabilitadas, informativas) */}
            {yaFacturadas.map((v) => (
              <div
                key={v.id}
                className="w-full border rounded-lg p-4 opacity-40 bg-muted/20 cursor-not-allowed"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                  <p className="text-sm font-medium">
                    Venta #{v.numero} · {v.cliente.nombreRazonSocial}
                    <span className="ml-2 text-xs text-muted-foreground">(ya facturada)</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selector de remito (opcional) */}
      {ventaSel && ventaSel.remitosEmitidos.length > 0 && (
        <div className="space-y-2">
          <Label>Asociar remito (opcional)</Label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => seleccionarRemito("")}
              className={cn(
                "border rounded-md px-3 py-1.5 text-sm transition-all",
                remitoSel === "" && "border-primary bg-primary/5 font-semibold"
              )}
            >
              Sin remito
            </button>
            {ventaSel.remitosEmitidos.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => seleccionarRemito(r.id)}
                className={cn(
                  "border rounded-md px-3 py-1.5 text-sm font-mono transition-all",
                  remitoSel === r.id && "border-primary bg-primary/5 font-semibold"
                )}
              >
                {r.numero}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Preview totales */}
      {ventaSel && (
        <div className="border rounded-lg p-4 bg-muted/20 space-y-1.5 text-sm">
          <p className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-2">
            Resumen del comprobante
          </p>
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatearPesos(ventaSel.subtotal)}</span>
          </div>
          {ventaSel.iva > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>IVA 21%</span>
              <span className="tabular-nums">{formatearPesos(ventaSel.iva)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold border-t pt-1.5 mt-1">
            <span>Total a facturar</span>
            <span className="tabular-nums">{formatearPesos(ventaSel.totalConIva)}</span>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={loading || !ventaSel}>
          {loading ? "Emitiendo..." : "Emitir factura"}
        </Button>
        <Link href="/facturacion" className={buttonVariants({ variant: "outline" })}>
          Cancelar
        </Link>
      </div>
    </form>
  )
}
