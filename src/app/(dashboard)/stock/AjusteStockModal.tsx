"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { SlidersHorizontal } from "lucide-react"

import { ajustarStock } from "@/server/actions/stock"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const schema = z.object({
  tipo: z.enum(["AJUSTE_POSITIVO", "AJUSTE_NEGATIVO"]),
  cantidad: z.number({ message: "Ingresá una cantidad válida" }).positive("Debe ser mayor a 0"),
  motivo: z.string().min(3, "Ingresá un motivo").max(200).trim(),
})

type FormData = z.infer<typeof schema>

interface Props {
  productoId: string
  nombreProducto: string
  stockActual: number
  unidad: string
}

export function AjusteStockModal({ productoId, nombreProducto, stockActual, unidad }: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { tipo: "AJUSTE_POSITIVO", motivo: "" },
  })

  function onSubmit(data: FormData) {
    startTransition(async () => {
      const resultado = await ajustarStock({ ...data, productoId })
      if (resultado.error) {
        toast.error(resultado.error)
        return
      }
      toast.success("Stock ajustado correctamente.")
      setOpen(false)
      reset()
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="sm" />}>
        <SlidersHorizontal className="h-4 w-4" />
        <span className="sr-only">Ajustar stock</span>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Ajuste de stock</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-2">
          <span className="font-medium text-foreground">{nombreProducto}</span>
          {" — "}stock actual: <span className="font-medium text-foreground">{stockActual} {unidad}</span>
        </p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Tipo de ajuste</Label>
            <Select
              defaultValue="AJUSTE_POSITIVO"
              onValueChange={(v) => v && setValue("tipo", v as "AJUSTE_POSITIVO" | "AJUSTE_NEGATIVO")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AJUSTE_POSITIVO">Agregar stock</SelectItem>
                <SelectItem value="AJUSTE_NEGATIVO">Restar stock</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cantidad">Cantidad ({unidad})</Label>
            <Input
              id="cantidad"
              type="number"
              step="0.001"
              min="0.001"
              placeholder="0"
              {...register("cantidad", { valueAsNumber: true })}
            />
            {errors.cantidad && <p className="text-sm text-destructive">{errors.cantidad.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo</Label>
            <Input id="motivo" placeholder="Ej: Conteo físico, merma, rotura..." {...register("motivo")} />
            {errors.motivo && <p className="text-sm text-destructive">{errors.motivo.message}</p>}
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Guardando..." : "Confirmar ajuste"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
