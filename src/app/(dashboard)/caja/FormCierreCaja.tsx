"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { esquemaCierreCaja, DatosCierreCaja } from "@/lib/validaciones/caja"
import { formatearPesos } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface Props {
  saldoEsperado:     number
  totalContadoHaber: number
  totalContadoDebe:  number
  totalCCHaber:      number
  totalCCDebe:       number
  onSubmit: (data: DatosCierreCaja) => Promise<{ ok?: boolean; error?: string }>
}

export function FormCierreCaja({
  saldoEsperado,
  totalContadoHaber,
  totalContadoDebe,
  totalCCHaber,
  totalCCDebe,
  onSubmit,
}: Props) {
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

  const saldoArqueo = Number(watch("saldoArqueo") ?? 0)
  const diferencia  = saldoArqueo - saldoEsperado
  const difPositiva = diferencia >= 0

  async function procesar(data: DatosCierreCaja) {
    setError(null)
    setLoading(true)
    const res = await onSubmit(data)
    if (res.error) setError(res.error)
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit(procesar)} className="space-y-4">

      {/* Resumen partida doble */}
      <div className="rounded-md border text-xs overflow-hidden">
        <div className="grid grid-cols-2 bg-muted/50">
          <div className="px-3 py-2 font-semibold text-muted-foreground border-r">Contado</div>
          <div className="px-3 py-2 font-semibold text-muted-foreground">Cuenta Corriente</div>
        </div>
        <div className="grid grid-cols-2 divide-x">
          {/* Contado */}
          <div className="divide-y">
            <div className="px-3 py-2 flex justify-between">
              <span className="text-green-700 font-medium">HABER</span>
              <span className="tabular-nums">{formatearPesos(totalContadoHaber)}</span>
            </div>
            <div className="px-3 py-2 flex justify-between">
              <span className="text-red-700 font-medium">DEBE</span>
              <span className="tabular-nums">{formatearPesos(totalContadoDebe)}</span>
            </div>
            <div className="px-3 py-2 flex justify-between bg-muted/30 font-semibold">
              <span>Neto</span>
              <span className={cn("tabular-nums", totalContadoHaber - totalContadoDebe >= 0 ? "text-green-700" : "text-red-700")}>
                {formatearPesos(totalContadoHaber - totalContadoDebe)}
              </span>
            </div>
          </div>
          {/* CC */}
          <div className="divide-y">
            <div className="px-3 py-2 flex justify-between">
              <span className="text-green-700 font-medium">HABER</span>
              <span className="tabular-nums">{formatearPesos(totalCCHaber)}</span>
            </div>
            <div className="px-3 py-2 flex justify-between">
              <span className="text-red-700 font-medium">DEBE</span>
              <span className="tabular-nums">{formatearPesos(totalCCDebe)}</span>
            </div>
            <div className="px-3 py-2 flex justify-between bg-muted/30 font-semibold">
              <span>Neto</span>
              <span className={cn("tabular-nums", totalCCHaber - totalCCDebe >= 0 ? "text-green-700" : "text-red-700")}>
                {formatearPesos(totalCCHaber - totalCCDebe)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Arqueo */}
      <div className="space-y-1">
        <Label htmlFor="saldoArqueo">Dinero contado en caja ($)</Label>
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

      {/* Diferencia */}
      <div className="rounded-md border bg-background p-3 space-y-1 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>Saldo esperado</span>
          <span className="tabular-nums font-medium">{formatearPesos(saldoEsperado)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Dinero contado</span>
          <span className="tabular-nums font-medium">{formatearPesos(saldoArqueo)}</span>
        </div>
        <div className="border-t pt-1 flex justify-between font-semibold">
          <span>Diferencia</span>
          <span
            className={cn(
              "tabular-nums",
              diferencia === 0
                ? "text-muted-foreground"
                : difPositiva
                ? "text-green-700"
                : "text-destructive"
            )}
          >
            {difPositiva && diferencia !== 0 ? "+" : ""}
            {formatearPesos(diferencia)}
          </span>
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="observaciones">Observaciones (opcional)</Label>
        <Input
          id="observaciones"
          {...register("observaciones")}
          placeholder="Notas sobre el cierre..."
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={loading} variant="destructive" className="w-full">
        {loading ? "Cerrando..." : "Cerrar caja"}
      </Button>
    </form>
  )
}
