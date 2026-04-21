"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { eliminarCliente } from "@/server/actions/clientes"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"

interface Props {
  id: string
  nombre: string
}

export function AccionesCliente({ id, nombre }: Props) {
  const router = useRouter()
  const [eliminando, setEliminando] = useState(false)

  async function handleEliminar() {
    const confirma = confirm(`¿Querés dar de baja al cliente "${nombre}"? Esta acción se puede revertir.`)
    if (!confirma) return

    setEliminando(true)
    const resultado = await eliminarCliente(id)
    setEliminando(false)

    if (resultado.ok) {
      toast.success("Cliente dado de baja correctamente.")
      router.refresh()
    } else {
      toast.error("No se pudo dar de baja el cliente.")
    }
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push(`/clientes/${id}/editar`)}
      >
        <Pencil className="h-4 w-4" />
        <span className="sr-only">Editar</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleEliminar}
        disabled={eliminando}
        className="text-destructive hover:text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="h-4 w-4" />
        <span className="sr-only">Dar de baja</span>
      </Button>
    </div>
  )
}
