"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toggleActivoUsuario } from "@/server/actions/usuarios"
import { resetearPasswordUsuario } from "@/server/actions/password"
import { submitSeguro } from "@/lib/submit-helpers"
import { Button } from "@/components/ui/button"
import { Pencil, PowerOff, Power, KeyRound, Copy, Check } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

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

  // Estado del reseteo de contraseña
  const [reseteando, setReseteando] = useState(false)
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)

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

  function handleResetear() {
    const confirma = confirm(
      `¿Generar una contraseña temporal para "${nombre}"?\n\n` +
      `El usuario deberá cambiarla en su próximo ingreso. Su contraseña actual dejará de funcionar.`
    )
    if (!confirma) return

    setReseteando(true)
    startTransition(async () => {
      const res = await submitSeguro(() => resetearPasswordUsuario(id))
      setReseteando(false)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      setTempPassword(res.data.passwordTemporal ?? null)
      setCopiado(false)
      router.refresh()
    })
  }

  async function copiar() {
    if (!tempPassword) return
    try {
      await navigator.clipboard.writeText(tempPassword)
      setCopiado(true)
      toast.success("Contraseña copiada al portapapeles.")
    } catch {
      toast.error("No se pudo copiar. Copiala manualmente.")
    }
  }

  return (
    <>
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/usuarios/${id}/editar`)}
          title="Editar"
        >
          <Pencil className="h-4 w-4" />
          <span className="sr-only">Editar</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleResetear}
          disabled={isPending || reseteando}
          title="Resetear contraseña"
          className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
        >
          <KeyRound className="h-4 w-4" />
          <span className="sr-only">Resetear contraseña</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggle}
          disabled={isPending || esMiMismo}
          title={localActivo ? "Desactivar" : "Activar"}
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

      {/* Diálogo con la contraseña temporal generada */}
      <Dialog open={!!tempPassword} onOpenChange={(o) => { if (!o) setTempPassword(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Contraseña temporal generada</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Pasale esta contraseña a <span className="font-medium text-foreground">{nombre}</span> por
              un canal seguro. La va a tener que cambiar la primera vez que ingrese.
              <br />
              <span className="text-amber-600 font-medium">Esta contraseña se muestra una sola vez.</span>
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-md border bg-muted px-3 py-2 text-lg font-mono tracking-wide text-center">
                {tempPassword}
              </code>
              <Button variant="outline" size="sm" onClick={copiar}>
                {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setTempPassword(null)}>Listo, la copié</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
