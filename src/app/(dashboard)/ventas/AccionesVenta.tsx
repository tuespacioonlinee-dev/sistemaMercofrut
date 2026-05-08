"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { anularVenta } from "@/server/actions/ventas"
import { Button } from "@/components/ui/button"
import { Eye, FileText, XCircle } from "lucide-react"
import { toast } from "sonner"
import { submitSeguro } from "@/lib/submit-helpers"

interface Props {
  id:       string
  numero:   number
  remitoId?: string   // primer remito vinculado (si existe)
}

export function AccionesVenta({ id, numero, remitoId }: Props) {
  const router    = useRouter()
  const [anulando, setAnulando] = useState(false)

  async function handleAnular() {
    const motivo = prompt(`¿Motivo de anulación de la venta #${String(numero).padStart(5, "0")}?`)
    if (!motivo || motivo.trim() === "") return

    setAnulando(true)
    try {
      const res = await submitSeguro(() => anularVenta(id, motivo.trim()))
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success("Venta anulada. El stock fue restaurado.")
      router.refresh()
    } finally {
      setAnulando(false)
    }
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {/* Ver remito */}
      {remitoId && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/remitos/${remitoId}`)}
          title="Ver remito"
        >
          <FileText className="h-4 w-4" />
          <span className="sr-only">Ver remito</span>
        </Button>
      )}

      {/* Ver detalle de venta */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push(`/ventas/${id}`)}
        title="Ver venta"
      >
        <Eye className="h-4 w-4" />
        <span className="sr-only">Ver detalle</span>
      </Button>

      {/* Anular */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleAnular}
        disabled={anulando}
        title="Anular venta"
        className="text-destructive hover:text-destructive hover:bg-destructive/10"
      >
        <XCircle className="h-4 w-4" />
        <span className="sr-only">Anular</span>
      </Button>
    </div>
  )
}
