"use client"

import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useTransition } from "react"
import { toast } from "sonner"
import type { Proveedor } from "@prisma/client"
import { CondicionIva, TipoDocumento } from "@prisma/client"
import { proveedorSchema, type ProveedorInput } from "@/lib/validaciones/proveedores"
import { crearProveedor, editarProveedor } from "@/server/actions/proveedores"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const LABELS_IVA: Record<CondicionIva, string> = {
  RESPONSABLE_INSCRIPTO: "Responsable Inscripto",
  MONOTRIBUTO: "Monotributo",
  EXENTO: "Exento",
  CONSUMIDOR_FINAL: "Consumidor Final",
  NO_RESPONSABLE: "No Responsable",
}

const LABELS_DOC: Record<TipoDocumento, string> = {
  CUIT: "CUIT",
  CUIL: "CUIL",
  DNI: "DNI",
  PASAPORTE: "Pasaporte",
  OTRO: "Otro",
}

interface Props {
  proveedor?: Proveedor
}

export function FormProveedor({ proveedor }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ProveedorInput>({
    resolver: zodResolver(proveedorSchema),
    defaultValues: proveedor
      ? {
          nombreRazonSocial: proveedor.nombreRazonSocial,
          tipoDocumento: proveedor.tipoDocumento,
          documento: proveedor.documento,
          condicionIva: proveedor.condicionIva,
          direccion: proveedor.direccion ?? "",
          localidad: proveedor.localidad ?? "",
          telefono: proveedor.telefono ?? "",
          email: proveedor.email ?? "",
          observaciones: proveedor.observaciones ?? "",
        }
      : {
          tipoDocumento: TipoDocumento.CUIT,
          condicionIva: CondicionIva.RESPONSABLE_INSCRIPTO,
        },
  })

  function onSubmit(data: ProveedorInput) {
    startTransition(async () => {
      const res = proveedor
        ? await editarProveedor(proveedor.id, data)
        : await crearProveedor(data)

      if (res.error) {
        toast.error(res.error)
        return
      }

      toast.success(proveedor ? "Proveedor actualizado" : "Proveedor creado")
      router.push("/proveedores")
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardContent className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Razón Social */}
          <div className="sm:col-span-2 space-y-1">
            <Label htmlFor="nombreRazonSocial">Razón Social / Nombre *</Label>
            <Input id="nombreRazonSocial" {...register("nombreRazonSocial")} />
            {errors.nombreRazonSocial && (
              <p className="text-xs text-destructive">{errors.nombreRazonSocial.message}</p>
            )}
          </div>

          {/* Tipo documento */}
          <div className="space-y-1">
            <Label>Tipo de documento *</Label>
            <Select
              defaultValue={proveedor?.tipoDocumento ?? TipoDocumento.CUIT}
              onValueChange={(v: string | null) => {
                if (v) setValue("tipoDocumento", v as TipoDocumento)
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(TipoDocumento).map((t) => (
                  <SelectItem key={t} value={t}>
                    {LABELS_DOC[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Documento */}
          <div className="space-y-1">
            <Label htmlFor="documento">Número de documento *</Label>
            <Input id="documento" placeholder="ej: 20-12345678-9" {...register("documento")} />
            {errors.documento && (
              <p className="text-xs text-destructive">{errors.documento.message}</p>
            )}
          </div>

          {/* Condición IVA */}
          <div className="sm:col-span-2 space-y-1">
            <Label>Condición ante el IVA *</Label>
            <Select
              defaultValue={proveedor?.condicionIva ?? CondicionIva.RESPONSABLE_INSCRIPTO}
              onValueChange={(v: string | null) => {
                if (v) setValue("condicionIva", v as CondicionIva)
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(CondicionIva).map((c) => (
                  <SelectItem key={c} value={c}>
                    {LABELS_IVA[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Teléfono */}
          <div className="space-y-1">
            <Label htmlFor="telefono">Teléfono</Label>
            <Input id="telefono" placeholder="ej: 381-4123456" {...register("telefono")} />
          </div>

          {/* Email */}
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register("email")} />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          {/* Dirección */}
          <div className="space-y-1">
            <Label htmlFor="direccion">Dirección</Label>
            <Input id="direccion" {...register("direccion")} />
          </div>

          {/* Localidad */}
          <div className="space-y-1">
            <Label htmlFor="localidad">Localidad</Label>
            <Input id="localidad" placeholder="ej: Tucumán" {...register("localidad")} />
          </div>

          {/* Observaciones */}
          <div className="sm:col-span-2 space-y-1">
            <Label htmlFor="observaciones">Observaciones</Label>
            <Input id="observaciones" {...register("observaciones")} />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={() => router.push("/proveedores")}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Guardando..." : proveedor ? "Guardar cambios" : "Crear proveedor"}
        </Button>
      </div>
    </form>
  )
}
