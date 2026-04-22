"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { esquemaCrearRemito, DatosCrearRemito } from "@/lib/validaciones/remitos"
import { crearRemito } from "@/server/actions/remitos"
import { formatearPesos } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button, buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { ArrowLeft, FileText, Package } from "lucide-react"

interface Venta {
  id: string
  numero: number
  fecha: string
  total: number
  condicion: string
  cliente: { nombreRazonSocial: string }
  remitosCount: number
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

export function FormNuevoRemito({ ventas }: Props) {
  const router = useRouter()
  const [ventaSeleccionada, setVentaSeleccionada] = useState<Venta | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<DatosCrearRemito>({
    resolver: zodResolver(esquemaCrearRemito),
  })

  function seleccionarVenta(v: Venta) {
    setVentaSeleccionada(v)
    setValue("ventaId", v.id)
  }

  async function procesar(data: DatosCrearRemito) {
    setError(null)
    setLoading(true)
    const res = await crearRemito(data)
    if (res.error) {
      setError(res.error)
      setLoading(false)
      return
    }
    router.push(`/remitos/${res.id}`)
  }

  return (
    <form onSubmit={handleSubmit(procesar)} className="space-y-6">
      <Link href="/remitos" className={buttonVariants({ variant: "outline", size: "sm" })}>
        <ArrowLeft className="h-4 w-4 mr-1" />
        Volver
      </Link>

      {/* Campo oculto */}
      <input type="hidden" {...register("ventaId")} />

      {/* Lista de ventas */}
      <div className="space-y-2">
        <Label>Venta a remitir *</Label>
        {errors.ventaId && <p className="text-xs text-destructive">{errors.ventaId.message}</p>}

        {ventas.length === 0 ? (
          <div className="border rounded-lg p-8 text-center text-muted-foreground">
            No hay ventas confirmadas disponibles.
          </div>
        ) : (
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {ventas.map((v) => {
              const seleccionada = ventaSeleccionada?.id === v.id
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => seleccionarVenta(v)}
                  className={cn(
                    "w-full text-left border rounded-lg p-4 transition-all hover:border-primary/60 hover:bg-muted/30",
                    seleccionada && "border-primary bg-primary/5 ring-1 ring-primary/30"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-sm">
                          Venta #{v.numero}{" "}
                          <span className="text-muted-foreground font-normal">·</span>{" "}
                          {v.cliente.nombreRazonSocial}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(v.fecha).toLocaleDateString("es-AR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}{" "}
                          · {v.condicion === "CONTADO" ? "Contado" : "Cuenta corriente"}
                          {v.remitosCount > 0 && (
                            <span className="ml-2 text-amber-600">
                              · {v.remitosCount} remito{v.remitosCount > 1 ? "s" : ""} previo{v.remitosCount > 1 ? "s" : ""}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <span className="font-semibold text-sm shrink-0">{formatearPesos(v.total)}</span>
                  </div>

                  {/* Items preview */}
                  <div className="mt-2 flex flex-wrap gap-1 pl-6">
                    {v.detalles.slice(0, 4).map((d) => (
                      <Badge key={d.id} variant="secondary" className="text-xs font-normal">
                        <Package className="h-3 w-3 mr-1" />
                        {d.cantidad} {d.unidad.abreviatura} {d.producto.nombre}
                      </Badge>
                    ))}
                    {v.detalles.length > 4 && (
                      <Badge variant="secondary" className="text-xs font-normal">
                        +{v.detalles.length - 4} más
                      </Badge>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Observaciones */}
      {ventaSeleccionada && (
        <div className="space-y-1">
          <Label htmlFor="observaciones">Observaciones (opcional)</Label>
          <Input
            id="observaciones"
            {...register("observaciones")}
            placeholder="Ej: entrega parcial, turno tarde..."
          />
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={loading || !ventaSeleccionada}>
          {loading ? "Generando..." : "Emitir remito"}
        </Button>
        <Link href="/remitos" className={buttonVariants({ variant: "outline" })}>
          Cancelar
        </Link>
      </div>
    </form>
  )
}
