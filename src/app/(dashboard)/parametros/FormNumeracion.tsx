"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { toast } from "sonner"
import { z } from "zod"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import type { DatosNumeracion } from "@/server/actions/parametros"

const esquema = z.object({
  puntoVenta:      z.number().int().min(1, "Mínimo 1"),
  proximoRemito:   z.number().int().min(1, "Mínimo 1"),
  proximaFacturaA: z.number().int().min(1, "Mínimo 1"),
  proximaFacturaB: z.number().int().min(1, "Mínimo 1"),
  proximaFacturaC: z.number().int().min(1, "Mínimo 1"),
})

interface Props {
  valoresIniciales?: DatosNumeracion | null
  onSubmit: (data: DatosNumeracion) => Promise<{ ok?: boolean; error?: string }>
}

export function FormNumeracion({ valoresIniciales, onSubmit }: Props) {
  const [guardando, setGuardando] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DatosNumeracion>({
    resolver: zodResolver(esquema),
    defaultValues: valoresIniciales ?? {
      puntoVenta:      1,
      proximoRemito:   1,
      proximaFacturaA: 1,
      proximaFacturaB: 1,
      proximaFacturaC: 1,
    },
  })

  async function procesarEnvio(data: DatosNumeracion) {
    setGuardando(true)
    const resultado = await onSubmit(data)
    setGuardando(false)

    if (resultado.error) {
      toast.error(resultado.error)
      return
    }
    toast.success("Numeración actualizada correctamente.")
  }

  return (
    <form onSubmit={handleSubmit(procesarEnvio)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Punto de venta */}
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="puntoVenta">Punto de venta</Label>
          <Input
            id="puntoVenta"
            type="number"
            min={1}
            className="max-w-[120px]"
            {...register("puntoVenta", { valueAsNumber: true })}
          />
          <p className="text-xs text-muted-foreground">
            Se usa como prefijo en todos los comprobantes (ej: 0001-00001).
          </p>
          {errors.puntoVenta && (
            <p className="text-sm text-destructive">{errors.puntoVenta.message}</p>
          )}
        </div>

        {/* Próximo remito */}
        <div className="space-y-1">
          <Label htmlFor="proximoRemito">Próximo N° de remito</Label>
          <Input
            id="proximoRemito"
            type="number"
            min={1}
            {...register("proximoRemito", { valueAsNumber: true })}
          />
          {errors.proximoRemito && (
            <p className="text-sm text-destructive">{errors.proximoRemito.message}</p>
          )}
        </div>

        {/* Próxima factura A */}
        <div className="space-y-1">
          <Label htmlFor="proximaFacturaA">Próximo N° factura A</Label>
          <Input
            id="proximaFacturaA"
            type="number"
            min={1}
            {...register("proximaFacturaA", { valueAsNumber: true })}
          />
          {errors.proximaFacturaA && (
            <p className="text-sm text-destructive">{errors.proximaFacturaA.message}</p>
          )}
        </div>

        {/* Próxima factura B */}
        <div className="space-y-1">
          <Label htmlFor="proximaFacturaB">Próximo N° factura B</Label>
          <Input
            id="proximaFacturaB"
            type="number"
            min={1}
            {...register("proximaFacturaB", { valueAsNumber: true })}
          />
          {errors.proximaFacturaB && (
            <p className="text-sm text-destructive">{errors.proximaFacturaB.message}</p>
          )}
        </div>

        {/* Próxima factura C */}
        <div className="space-y-1">
          <Label htmlFor="proximaFacturaC">Próximo N° factura C</Label>
          <Input
            id="proximaFacturaC"
            type="number"
            min={1}
            {...register("proximaFacturaC", { valueAsNumber: true })}
          />
          {errors.proximaFacturaC && (
            <p className="text-sm text-destructive">{errors.proximaFacturaC.message}</p>
          )}
        </div>
      </div>

      <div className="pt-1">
        <Button type="submit" disabled={guardando} variant="outline">
          {guardando ? "Guardando..." : "Actualizar numeración"}
        </Button>
      </div>
    </form>
  )
}
