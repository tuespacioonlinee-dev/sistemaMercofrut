"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { cerrarLote } from "@/server/actions/lotes"
import { Button } from "@/components/ui/button"
import { XCircle } from "lucide-react"
import { toast } from "sonner"
import { submitSeguro } from "@/lib/submit-helpers"

export function CerrarLoteButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleCerrar() {
    if (!confirm("¿Cerrar este lote? Ya no aparecerá en el listado activo.")) return
    startTransition(async () => {
      const res = await submitSeguro(() => cerrarLote(id))
      if (!res.ok) { toast.error(res.error); return }
      toast.success("Lote cerrado.")
      router.refresh()
    })
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={handleCerrar}
      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
    >
      <XCircle className="h-4 w-4" />
      <span className="sr-only">Cerrar lote</span>
    </Button>
  )
}
