"use client"

import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { toast } from "sonner"

import { esquemaCuenta, DatosCuenta, etiquetasTipoCuenta } from "@/lib/validaciones/cuentas"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface Cliente {
  id: string
  nombreRazonSocial: string
  documento: string
}

interface Props {
  clientes: Cliente[]
  onSubmit: (data: DatosCuenta) => Promise<{ ok?: boolean; error?: string; id?: string }>
}

const selectClasses = cn(
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm",
  "outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
)

export function FormularioCuenta({ clientes, onSubmit }: Props) {
  const router = useRouter()
  const [guardando, setGuardando] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<DatosCuenta>({
    resolver: zodResolver(esquemaCuenta),
    defaultValues: { tipo: "CORRIENTE" },
  })

  const clienteId = watch("clienteId")
  const tipo = watch("tipo")

  // Auto-completar el nombre de la cuenta cuando se elige cliente y tipo
  function actualizarNombre(nuevoClienteId?: string, nuevoTipo?: string) {
    const idFinal = nuevoClienteId ?? clienteId
    const tipoFinal = nuevoTipo ?? tipo
    const cliente = clientes.find((c) => c.id === idFinal)
    if (cliente && tipoFinal) {
      const etiqueta = tipoFinal === "CORRIENTE" ? "Cta. Cte." : "Contado"
      setValue("nombre", `${etiqueta} - ${cliente.nombreRazonSocial}`)
    }
  }

  async function procesarEnvio(data: DatosCuenta) {
    setGuardando(true)
    const resultado = await onSubmit(data)
    setGuardando(false)

    if (resultado.error) {
      toast.error(resultado.error)
      return
    }

    toast.success("Cuenta creada correctamente.")
    if (resultado.id) {
      router.push(`/cuentas/${resultado.id}`)
    } else {
      router.push("/cuentas")
    }
  }

  return (
    <form onSubmit={handleSubmit(procesarEnvio)} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="clienteId">Cliente *</Label>
        <select
          id="clienteId"
          className={selectClasses}
          {...register("clienteId")}
          onChange={(e) => {
            register("clienteId").onChange(e)
            actualizarNombre(e.target.value, undefined)
          }}
        >
          <option value="">Seleccioná un cliente...</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombreRazonSocial} — {c.documento}
            </option>
          ))}
        </select>
        {errors.clienteId && <p className="text-sm text-destructive">{errors.clienteId.message}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="tipo">Tipo de cuenta *</Label>
        <select
          id="tipo"
          className={selectClasses}
          {...register("tipo")}
          onChange={(e) => {
            register("tipo").onChange(e)
            actualizarNombre(undefined, e.target.value)
          }}
        >
          {Object.entries(etiquetasTipoCuenta).map(([valor, etiqueta]) => (
            <option key={valor} value={valor}>{etiqueta}</option>
          ))}
        </select>
        {errors.tipo && <p className="text-sm text-destructive">{errors.tipo.message}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="nombre">Nombre de la cuenta *</Label>
        <Input
          id="nombre"
          placeholder="Se completa automáticamente al elegir cliente y tipo"
          {...register("nombre")}
        />
        {errors.nombre && <p className="text-sm text-destructive">{errors.nombre.message}</p>}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={guardando}>
          {guardando ? "Creando..." : "Crear cuenta"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/cuentas")} disabled={guardando}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
