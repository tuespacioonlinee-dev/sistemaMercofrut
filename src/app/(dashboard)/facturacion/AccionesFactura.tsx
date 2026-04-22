"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { esquemaAnularFactura, DatosAnularFactura } from "@/lib/validaciones/facturacion"
import { anularFactura } from "@/server/actions/facturacion"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { XCircle } from "lucide-react"

interface Props {
  facturaId: string
}

export function AccionesFactura({ facturaId }: Props) {
  const router = useRouter()
  const [mostrando, setMostrando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DatosAnularFactura>({
    resolver: zodResolver(esquemaAnularFactura),
  })

  async function confirmar(data: DatosAnularFactura) {
    setError(null)
    setLoading(true)
    const res = await anularFactura(facturaId, data)
    if (res.error) {
      setError(res.error)
      setLoading(false)
      return
    }
    router.refresh()
  }

  if (!mostrando) {
    return (
      <Button variant="destructive" size="sm" onClick={() => setMostrando(true)}>
        <XCircle className="h-4 w-4 mr-1" />
        Anular factura
      </Button>
    )
  }

  return (
    <form
      onSubmit={handleSubmit(confirmar)}
      className="border border-destructive/40 rounded-lg p-4 bg-destructive/5 space-y-3 w-80"
    >
      <p className="text-sm font-semibold text-destructive">Anular factura</p>

      <div className="space-y-1">
        <Label htmlFor="motivoAnulacion" className="text-xs">
          Motivo *
        </Label>
        <Input
          id="motivoAnulacion"
          {...register("motivoAnulacion")}
          placeholder="Motivo de la anulación..."
          className="text-sm"
          autoFocus
        />
        {errors.motivoAnulacion && (
          <p className="text-xs text-destructive">{errors.motivoAnulacion.message}</p>
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" variant="destructive" size="sm" disabled={loading}>
          {loading ? "Anulando..." : "Confirmar"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setMostrando(false)}
          disabled={loading}
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}
