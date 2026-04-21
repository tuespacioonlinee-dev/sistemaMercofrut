"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { esquemaAperturaCaja, DatosAperturaCaja } from "@/lib/validaciones/caja"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface Props {
  onSubmit: (data: DatosAperturaCaja) => Promise<{ ok?: boolean; error?: string }>
}

export function FormAperturaCaja({ onSubmit }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DatosAperturaCaja>({
    resolver: zodResolver(esquemaAperturaCaja),
    defaultValues: { saldoInicial: 0 },
  })

  async function procesar(data: DatosAperturaCaja) {
    setError(null)
    setLoading(true)
    const res = await onSubmit(data)
    if (res.error) setError(res.error)
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit(procesar)} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="saldoInicial">Saldo inicial ($)</Label>
        <Input
          id="saldoInicial"
          type="number"
          step="0.01"
          min="0"
          {...register("saldoInicial", { valueAsNumber: true })}
          placeholder="0.00"
        />
        {errors.saldoInicial && (
          <p className="text-xs text-destructive">{errors.saldoInicial.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="observaciones">Observaciones (opcional)</Label>
        <Input
          id="observaciones"
          {...register("observaciones")}
          placeholder="Ej: cambio en efectivo, billete roto..."
        />
        {errors.observaciones && (
          <p className="text-xs text-destructive">{errors.observaciones.message}</p>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Abriendo..." : "Abrir caja"}
      </Button>
    </form>
  )
}
