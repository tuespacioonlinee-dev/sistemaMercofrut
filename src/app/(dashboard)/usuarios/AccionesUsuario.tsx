"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toggleActivoUsuario } from "@/server/actions/usuarios"
import { Button } from "@/components/ui/button"
import { Pencil, PowerOff, Power } from "lucide-react"
import { toast } from "sonner"

interface Props {
  id: string
  nombre: string
  activo: boolean
  esMiMismo: boolean
}

export function AccionesUsuario({ id, nombre, activo, esMiMismo }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [localActivo, setLocalActivo] = useState(activo)

  function handleToggle() {
    if (esMiMismo) {
      toast.error("No podés desactivar tu propio usuario.")
      return
    }
    const accion = localActivo ? "desactivar" : "activar"
    const confirma = confirm(`¿Querés ${accion} al usuario "${nombre}"?`)
    if (!confirma) return

    startTransition(async () => {
      const resultado = await toggleActivoUsuario(id, localActivo)
      if (resultado.ok) {
        setLocalActivo((v) => !v)
        toast.success(`Usuario ${localActivo ? "desactivado" : "activado"} correctamente.`)
        router.refresh()
      } else {
        toast.error("No se pudo cambiar el estado del usuario.")
      }
    })
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push(`/usuarios/${id}/editar`)}
      >
        <Pencil className="h-4 w-4" />
        <span className="sr-only">Editar</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleToggle}
        disabled={isPending || esMiMismo}
        className={
          localActivo
            ? "text-destructive hover:text-destructive hover:bg-destructive/10"
            : "text-green-600 hover:text-green-700 hover:bg-green-50"
        }
      >
        {localActivo ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
        <span className="sr-only">{localActivo ? "Desactivar" : "Activar"}</span>
      </Button>
    </div>
  )
}
