"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { toast } from "sonner"

import {
  esquemaCliente,
  DatosCliente,
  etiquetasTipoDocumento,
  etiquetasCondicionIva,
} from "@/lib/validaciones/clientes"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

interface Props {
  valoresIniciales?: Partial<DatosCliente>
  onSubmit: (data: DatosCliente) => Promise<{ ok?: boolean; error?: string }>
  modoEdicion?: boolean
}

// Estilo compartido para los <select> nativos, igual al Input de shadcn
const selectClasses = cn(
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm",
  "outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
  "disabled:cursor-not-allowed disabled:opacity-50"
)

export function FormularioCliente({ valoresIniciales, onSubmit, modoEdicion = false }: Props) {
  const router = useRouter()
  const [guardando, setGuardando] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<DatosCliente>({
    resolver: zodResolver(esquemaCliente),
    defaultValues: {
      tipoDocumento: "DNI",
      condicionIva: "CONSUMIDOR_FINAL",
      ...valoresIniciales,
    },
  })

  const tipoDocumento = watch("tipoDocumento")

  // Restricciones por tipo de documento
  const docConfig: Record<string, { maxLength: number; inputMode: React.HTMLAttributes<HTMLInputElement>["inputMode"]; placeholder: string }> = {
    DNI:       { maxLength: 8,  inputMode: "numeric", placeholder: "Ej: 30123456" },
    CUIT:      { maxLength: 13, inputMode: "numeric", placeholder: "Ej: 20-30123456-7" },
    CUIL:      { maxLength: 13, inputMode: "numeric", placeholder: "Ej: 27-30123456-3" },
    PASAPORTE: { maxLength: 9,  inputMode: "text",    placeholder: "Ej: AAB123456" },
    OTRO:      { maxLength: 20, inputMode: "text",    placeholder: "Número de documento" },
  }
  const docCfg = docConfig[tipoDocumento] ?? docConfig.OTRO

  async function procesarEnvio(data: DatosCliente) {
    setGuardando(true)
    const resultado = await onSubmit(data)
    setGuardando(false)

    if (resultado.error) {
      toast.error(resultado.error)
      return
    }

    toast.success(modoEdicion ? "Cliente actualizado correctamente." : "Cliente creado correctamente.")
    router.push("/clientes")
  }

  return (
    <form onSubmit={handleSubmit(procesarEnvio)} className="space-y-6">
      {/* Datos principales */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold">Datos principales</h2>

        <div className="space-y-1">
          <Label htmlFor="nombreRazonSocial">Nombre / Razón Social *</Label>
          <Input
            id="nombreRazonSocial"
            placeholder="Ej: Juan García o Frutas Pérez S.R.L."
            {...register("nombreRazonSocial")}
          />
          {errors.nombreRazonSocial && (
            <p className="text-sm text-destructive">{errors.nombreRazonSocial.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="tipoDocumento">Tipo de documento *</Label>
            <select id="tipoDocumento" className={selectClasses} {...register("tipoDocumento")}>
              {Object.entries(etiquetasTipoDocumento).map(([valor, etiqueta]) => (
                <option key={valor} value={valor}>{etiqueta}</option>
              ))}
            </select>
            {errors.tipoDocumento && (
              <p className="text-sm text-destructive">{errors.tipoDocumento.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="documento">Número de documento *</Label>
            <Input
              id="documento"
              placeholder={docCfg.placeholder}
              maxLength={docCfg.maxLength}
              inputMode={docCfg.inputMode}
              {...register("documento")}
            />
            {errors.documento && (
              <p className="text-sm text-destructive">{errors.documento.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="condicionIva">Condición IVA *</Label>
          <select id="condicionIva" className={selectClasses} {...register("condicionIva")}>
            {Object.entries(etiquetasCondicionIva).map(([valor, etiqueta]) => (
              <option key={valor} value={valor}>{etiqueta}</option>
            ))}
          </select>
          {errors.condicionIva && (
            <p className="text-sm text-destructive">{errors.condicionIva.message}</p>
          )}
        </div>
      </div>

      <Separator />

      {/* Datos de contacto */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold">Datos de contacto</h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="telefono">Teléfono</Label>
            <Input
              id="telefono"
              placeholder="Ej: 0381-4123456"
              {...register("telefono")}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Ej: cliente@mail.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="direccion">Dirección</Label>
            <Input
              id="direccion"
              placeholder="Ej: Av. Belgrano 1234"
              {...register("direccion")}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="localidad">Localidad</Label>
            <Input
              id="localidad"
              placeholder="Ej: San Miguel de Tucumán"
              {...register("localidad")}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Observaciones */}
      <div className="space-y-1">
        <Label htmlFor="observaciones">Observaciones</Label>
        <Textarea
          id="observaciones"
          placeholder="Notas internas sobre el cliente..."
          rows={3}
          {...register("observaciones")}
        />
      </div>

      {/* Botones */}
      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={guardando}>
          {guardando ? "Guardando..." : modoEdicion ? "Guardar cambios" : "Crear cliente"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/clientes")}
          disabled={guardando}
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}
