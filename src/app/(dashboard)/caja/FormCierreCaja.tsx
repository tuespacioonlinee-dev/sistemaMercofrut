"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { esquemaCierreCaja, DatosCierreCaja } from "@/lib/validaciones/caja"
import { formatearPesos } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface Props {
  saldoEsperado: number
  onSubmit: (data: DatosCierreCaja) => Promise<{ ok?: boolean; error?: string }>
}

export function FormCierreCaja({ saldoEsperado, onSubmit }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<DatosCierreCaja>({
    resolver: zodResolver(esquemaCierreCaja),
    defaultValues: { saldoArqueo: 0 },
  })

  const saldoArqueo = watch("saldoArqueo") ?? 0
  const diferencia = Number(saldoArqueo) - saldoEsperado
  const diferenciaPositiva = diferencia >= 0

  async function procesar(data: DatosCierreCaja) {
    setError(null)
    setLoading(true)
    const res = await onSubmit(data)
    if (res.error) setError(res.error)
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit(procesar)} className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="saldoArqueo">Dinero contado ($)</Label>
        <Input
          id="saldoArqueo"
          type="number"
          step="0.01"
          min="0"
          {...register("saldoArqueo", { valueAsNumber: true })}
          placeholder="0.00"
        />
        {errors.saldoArqueo && (
          <p className="text-xs text-destructive">{errors.saldoArqueo.message}</p>
        )}
      </div>

      {/* Resumen de diferencia */}
      <div className="rounded-md border bg-background p-3 space-y-1 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>Saldo esperado</span>
          <span className="tabular-nums font-medium">{formatearPesos(saldoEsperado)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Dinero contado</span>
          <span className="tabular-nums font-medium">{formatearPesos(Number(saldoArqueo) || 0)}</span>
        </div>
        <div className="border-t pt-1 flex justify-between font-semibold">
          <span>Diferencia</span>
          <span
            className={cn(
              "tabular-nums",
              diferencia === 0
                ? "text-muted-foreground"
                : diferenciaPositiva
                ? "text-green-700"
                : "text-destructive"
            )}
          >
            {diferenciaPositiva && diferencia !== 0 ? "+" : ""}
            {formatearPesos(diferencia)}
          </span>
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="observacionesCierre">Observaciones (opcional)</Label>
        <Input
          id="observacionesCierre"
          {...register("observaciones")}
          placeholder="Notas sobre el cierre..."
        />
        {errors.observaciones && (
          <p className="text-xs text-destructive">{errors.observaciones.message}</p>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={loading} variant="destructive" className="w-full">
        {loading ? "Cerrando..." : "Cerrar caja"}
      </Button>
    </form>
  )
}
