"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { toast } from "sonner"
import { z } from "zod"
import { RolUsuario } from "@prisma/client"

import { etiquetasRol } from "@/lib/validaciones/usuarios"
import { crearUsuario, editarUsuario } from "@/server/actions/usuarios"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"

const formSchema = z.object({
  nombre: z.string().min(2, "Mínimo 2 caracteres").max(100).trim(),
  email: z.string().email("Email inválido").max(200).trim().toLowerCase(),
  password: z.string().max(100),
  rol: z.nativeEnum(RolUsuario, { message: "Rol inválido" }),
  activo: z.boolean(),
})

type FormData = z.infer<typeof formSchema>

type ModoCrear = { modo: "crear" }
type ModoEditar = {
  modo: "editar"
  id: string
  defaults: { nombre: string; email: string; rol: RolUsuario; activo: boolean }
}
type Props = ModoCrear | ModoEditar

export function FormularioUsuario(props: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const esEditar = props.modo === "editar"

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: esEditar
      ? { ...props.defaults, password: "" }
      : { nombre: "", email: "", password: "", rol: RolUsuario.VENDEDOR, activo: true },
  })

  const { register, handleSubmit, setValue, formState: { errors } } = form

  function onSubmit(data: FormData) {
    if (!esEditar && data.password.length < 6) {
      form.setError("password", { message: "Mínimo 6 caracteres" })
      return
    }

    startTransition(async () => {
      const resultado = esEditar
        ? await editarUsuario((props as ModoEditar).id, data)
        : await crearUsuario({ ...data, password: data.password })

      if (resultado.error) {
        toast.error(resultado.error)
        return
      }

      toast.success(esEditar ? "Usuario actualizado correctamente." : "Usuario creado correctamente.")
      router.push("/usuarios")
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-md">
      <div className="space-y-2">
        <Label htmlFor="nombre">Nombre completo</Label>
        <Input id="nombre" placeholder="Ej: Juan García" {...register("nombre")} />
        {errors.nombre && <p className="text-sm text-destructive">{errors.nombre.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" placeholder="usuario@email.com" {...register("email")} />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">
          {esEditar ? "Nueva contraseña (dejá vacío para no cambiar)" : "Contraseña"}
        </Label>
        <Input
          id="password"
          type="password"
          placeholder={esEditar ? "Dejá vacío para no cambiar" : "Mínimo 6 caracteres"}
          {...register("password")}
        />
        {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
      </div>

      <div className="space-y-2">
        <Label>Rol</Label>
        <Select
          defaultValue={esEditar ? (props as ModoEditar).defaults.rol : RolUsuario.VENDEDOR}
          onValueChange={(v) => v && setValue("rol", v as RolUsuario)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccioná un rol" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(etiquetasRol).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.rol && <p className="text-sm text-destructive">{errors.rol.message}</p>}
      </div>

      {esEditar && (
        <div className="flex items-center gap-2">
          <Checkbox
            id="activo"
            defaultChecked={(props as ModoEditar).defaults.activo}
            onCheckedChange={(v) => setValue("activo", v === true)}
          />
          <Label htmlFor="activo" className="cursor-pointer">Usuario activo</Label>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Guardando..." : esEditar ? "Guardar cambios" : "Crear usuario"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
