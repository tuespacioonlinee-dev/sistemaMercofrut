"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import {
  esquemaMovimientoCaja,
  DatosMovimientoCaja,
  etiquetasCategoria,
  categoriaATipo,
  etiquetasTipo,
  CATEGORIAS_MOV_CAJA,
} from "@/lib/validaciones/caja"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface Props {
  onSubmit: (data: DatosMovimientoCaja) => Promise<{ ok?: boolean; error?: string }>
}

export function FormMovimiento({ onSubmit }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<DatosMovimientoCaja>({
    resolver: zodResolver(esquemaMovimientoCaja),
    defaultValues: {
      categoria:  "GASTO",
      ladoOtro:   "DEBE",
      monto:      0,
      descripcion: "",
    },
  })

  const categoria  = watch("categoria")
  const tipoAuto   = categoriaATipo[categoria] // null solo si OTRO
  const esOtro     = categoria === "OTRO"

  async function procesar(data: DatosMovimientoCaja) {
    setError(null)
    setLoading(true)
    const res = await onSubmit(data)
    if (res.error) {
      setError(res.error)
    } else {
      reset({ categoria: "GASTO", ladoOtro: "DEBE", monto: 0, descripcion: "" })
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit(procesar)} className="space-y-3">
      {/* Categoría */}
      <div className="space-y-1">
        <Label htmlFor="categoria">Categoría</Label>
        <select
          id="categoria"
          {...register("categoria")}
          className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {CATEGORIAS_MOV_CAJA.map((cat) => (
            <option key={cat} value={cat}>
              {etiquetasCategoria[cat]}
            </option>
          ))}
        </select>
        {errors.categoria && (
          <p className="text-xs text-destructive">{errors.categoria.message}</p>
        )}
      </div>

      {/* Tipo contable derivado (informativo) */}
      <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        Columna contable:{" "}
        {esOtro ? (
          <span className="text-foreground font-medium">según tu elección abajo</span>
        ) : (
          <span
            className={cn(
              "font-semibold",
              tipoAuto === "CONTADO_HABER" || tipoAuto === "CC_HABER"
                ? "text-green-700"
                : "text-red-700"
            )}
          >
            {tipoAuto ? etiquetasTipo[tipoAuto] : "—"}
          </span>
        )}
      </div>

      {/* Selector DEBE/HABER — solo visible para OTRO */}
      {esOtro && (
        <div className="space-y-1">
          <Label>¿Es ingreso o egreso de caja?</Label>
          <div className="flex gap-2">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" value="HABER" {...register("ladoOtro")} />
              <span className="text-sm text-green-700 font-medium">HABER (ingreso)</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" value="DEBE" {...register("ladoOtro")} />
              <span className="text-sm text-red-700 font-medium">DEBE (egreso)</span>
            </label>
          </div>
          {errors.ladoOtro && (
            <p className="text-xs text-destructive">{errors.ladoOtro.message}</p>
          )}
        </div>
      )}

      {/* Monto */}
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

      {/* Descripción */}
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
