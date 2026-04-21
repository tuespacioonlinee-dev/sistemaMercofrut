"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useState, useEffect } from "react"
import { esquemaMovimientoCaja, DatosMovimientoCaja, etiquetasCategoria, categoriasTipo } from "@/lib/validaciones/caja"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface Props {
  onSubmit: (data: DatosMovimientoCaja) => Promise<{ ok?: boolean; error?: string }>
}

const CATEGORIAS = [
  "VENTA_CONTADO",
  "COBRO_CLIENTE",
  "PAGO_PROVEEDOR",
  "COMPRA_CONTADO",
  "GASTO",
  "RETIRO",
  "DEPOSITO",
  "OTRO",
] as const

export function FormMovimiento({ onSubmit }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<DatosMovimientoCaja>({
    resolver: zodResolver(esquemaMovimientoCaja),
    defaultValues: {
      tipo: "INGRESO",
      categoria: "VENTA_CONTADO",
      monto: 0,
      descripcion: "",
    },
  })

  const categoriaSeleccionada = watch("categoria")

  // Auto-actualizar tipo según categoría
  useEffect(() => {
    if (categoriaSeleccionada) {
      const tipo = categoriasTipo[categoriaSeleccionada]
      if (tipo) setValue("tipo", tipo)
    }
  }, [categoriaSeleccionada, setValue])

  const tipoActual = watch("tipo")

  async function procesar(data: DatosMovimientoCaja) {
    setError(null)
    setLoading(true)
    const res = await onSubmit(data)
    if (res.error) {
      setError(res.error)
    } else {
      reset({
        tipo: "INGRESO",
        categoria: "VENTA_CONTADO",
        monto: 0,
        descripcion: "",
      })
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit(procesar)} className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="categoria">Categoría</Label>
        <select
          id="categoria"
          {...register("categoria")}
          className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {CATEGORIAS.map((cat) => (
            <option key={cat} value={cat}>
              {etiquetasCategoria[cat]}
            </option>
          ))}
        </select>
        {errors.categoria && (
          <p className="text-xs text-destructive">{errors.categoria.message}</p>
        )}
      </div>

      {/* Tipo derivado — solo informativo */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Tipo:</span>
        <span
          className={
            tipoActual === "INGRESO"
              ? "font-semibold text-green-700"
              : "font-semibold text-red-700"
          }
        >
          {tipoActual === "INGRESO" ? "Ingreso" : "Egreso"}
        </span>
      </div>

      <div className="space-y-1">
        <Label htmlFor="monto">Monto ($)</Label>
        <Input
          id="monto"
          type="number"
          step="0.01"
          min="0.01"
          {...register("monto", { valueAsNumber: true })}
          placeholder="0.00"
        />
        {errors.monto && (
          <p className="text-xs text-destructive">{errors.monto.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="descripcion">Descripción</Label>
        <Input
          id="descripcion"
          {...register("descripcion")}
          placeholder="Ej: pago luz, compra verdura..."
        />
        {errors.descripcion && (
          <p className="text-xs text-destructive">{errors.descripcion.message}</p>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Registrando..." : "Registrar movimiento"}
      </Button>
    </form>
  )
}
