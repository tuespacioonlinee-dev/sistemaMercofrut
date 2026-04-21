"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { toast } from "sonner"

import { esquemaParametros, DatosParametros, etiquetasCondicionIva } from "@/lib/validaciones/parametros"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

interface Props {
  valoresIniciales?: Partial<DatosParametros>
  onSubmit: (data: DatosParametros) => Promise<{ ok?: boolean; error?: string }>
}

const selectClasses = cn(
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm",
  "outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
)

export function FormularioParametros({ valoresIniciales, onSubmit }: Props) {
  const [guardando, setGuardando] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DatosParametros>({
    resolver: zodResolver(esquemaParametros),
    defaultValues: {
      condicionIva: "RESPONSABLE_INSCRIPTO",
      ...valoresIniciales,
    },
  })

  async function procesarEnvio(data: DatosParametros) {
    setGuardando(true)
    const resultado = await onSubmit(data)
    setGuardando(false)

    if (resultado.error) {
      toast.error(resultado.error)
      return
    }

    toast.success("Parámetros guardados correctamente.")
  }

  return (
    <form onSubmit={handleSubmit(procesarEnvio)} className="space-y-6">
      {/* Datos fiscales */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold">Datos del negocio</h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="nombreFantasia">Nombre de fantasía *</Label>
            <Input id="nombreFantasia" placeholder="Ej: Frutas El Cono" {...register("nombreFantasia")} />
            {errors.nombreFantasia && <p className="text-sm text-destructive">{errors.nombreFantasia.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="razonSocial">Razón social *</Label>
            <Input id="razonSocial" placeholder="Ej: García Juan Carlos" {...register("razonSocial")} />
            {errors.razonSocial && <p className="text-sm text-destructive">{errors.razonSocial.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="cuit">CUIT *</Label>
            <Input id="cuit" placeholder="Ej: 20-12345678-3" {...register("cuit")} />
            {errors.cuit && <p className="text-sm text-destructive">{errors.cuit.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="condicionIva">Condición IVA *</Label>
            <select id="condicionIva" className={selectClasses} {...register("condicionIva")}>
              {Object.entries(etiquetasCondicionIva).map(([valor, etiqueta]) => (
                <option key={valor} value={valor}>{etiqueta}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="ingresosBrutos">Ingresos Brutos</Label>
            <Input id="ingresosBrutos" placeholder="Ej: 123456789" {...register("ingresosBrutos")} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="inicioActividades">Inicio de actividades</Label>
            <Input id="inicioActividades" type="date" {...register("inicioActividades")} />
          </div>
        </div>
      </div>

      <Separator />

      {/* Ubicación y contacto */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold">Ubicación y contacto</h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="direccion">Dirección *</Label>
            <Input id="direccion" placeholder="Ej: Av. Belgrano 1234" {...register("direccion")} />
            {errors.direccion && <p className="text-sm text-destructive">{errors.direccion.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="localidad">Localidad *</Label>
            <Input id="localidad" placeholder="Ej: San Miguel de Tucumán" {...register("localidad")} />
            {errors.localidad && <p className="text-sm text-destructive">{errors.localidad.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="telefono">Teléfono</Label>
            <Input id="telefono" placeholder="Ej: 0381-4123456" {...register("telefono")} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="Ej: negocio@mail.com" {...register("email")} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
        </div>
      </div>

      <div className="pt-2">
        <Button type="submit" disabled={guardando}>
          {guardando ? "Guardando..." : "Guardar parámetros"}
        </Button>
      </div>
    </form>
  )
}
