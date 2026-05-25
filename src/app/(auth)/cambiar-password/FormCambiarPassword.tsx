"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { signOut } from "next-auth/react"
import { toast } from "sonner"
import { ShieldCheck, Lock } from "lucide-react"

import { cambiarPasswordSchema, type CambiarPasswordInput } from "@/lib/validaciones/password"
import { cambiarPasswordPropia } from "@/server/actions/password"
import { submitSeguro } from "@/lib/submit-helpers"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Props {
  nombreFantasia: string
  obligatorio: boolean
}

export function FormCambiarPassword({ nombreFantasia, obligatorio }: Props) {
  const [cargando, setCargando] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CambiarPasswordInput>({
    resolver: zodResolver(cambiarPasswordSchema),
  })

  async function onSubmit(data: CambiarPasswordInput) {
    setCargando(true)
    try {
      const res = await submitSeguro(() => cambiarPasswordPropia(data))
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success("Contraseña actualizada. Ingresá nuevamente con tu nueva contraseña.")
      // Cerramos sesión para que el próximo login genere un token fresco
      // (sin el flag debeCambiarPassword). Es el camino más seguro y simple.
      await signOut({ callbackUrl: "/login" })
    } finally {
      setCargando(false)
    }
  }

  return (
    <Card className="w-full max-w-sm shadow-lg">
      <CardHeader className="space-y-2 text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
          <ShieldCheck className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-xl font-bold">{nombreFantasia}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {obligatorio
            ? "Por seguridad, creá tu propia contraseña antes de empezar a usar el sistema."
            : "Cambiá tu contraseña."}
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="passwordActual">
              {obligatorio ? "Contraseña actual (la que te dieron)" : "Contraseña actual"}
            </Label>
            <Input
              id="passwordActual"
              type="password"
              autoComplete="current-password"
              disabled={cargando}
              {...register("passwordActual")}
            />
            {errors.passwordActual && (
              <p className="text-xs text-destructive">{errors.passwordActual.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="passwordNueva">Nueva contraseña</Label>
            <Input
              id="passwordNueva"
              type="password"
              autoComplete="new-password"
              disabled={cargando}
              {...register("passwordNueva")}
            />
            {errors.passwordNueva && (
              <p className="text-xs text-destructive">{errors.passwordNueva.message}</p>
            )}
            <p className="text-[11px] text-muted-foreground">
              Mínimo 8 caracteres, con al menos una letra y un número.
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="confirmar">Repetir nueva contraseña</Label>
            <Input
              id="confirmar"
              type="password"
              autoComplete="new-password"
              disabled={cargando}
              {...register("confirmar")}
            />
            {errors.confirmar && (
              <p className="text-xs text-destructive">{errors.confirmar.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={cargando}>
            <Lock className="h-4 w-4 mr-2" />
            {cargando ? "Guardando..." : "Guardar nueva contraseña"}
          </Button>

          {obligatorio && (
            <p className="text-center text-[11px] text-muted-foreground">
              Solo vos vas a conocer esta contraseña. Si la olvidás, el administrador
              puede generarte una nueva temporal.
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
