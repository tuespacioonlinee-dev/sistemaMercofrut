import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { obtenerClientes } from "@/server/actions/clientes"
import { FormularioCuenta } from "./FormularioCuenta"
import { crearCuenta } from "@/server/actions/cuentas"
import { DatosCuenta } from "@/lib/validaciones/cuentas"

export default async function NuevaCuentaPage() {
  const clientes = await obtenerClientes()

  async function accionCrear(data: DatosCuenta) {
    "use server"
    return crearCuenta(data)
  }

  return (
    <div className="p-6 max-w-lg space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/cuentas" className="flex items-center gap-1 hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" />
          Cuentas
        </Link>
        <span>/</span>
        <span className="text-foreground">Nueva cuenta</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Nueva cuenta</h1>
        <p className="text-sm text-muted-foreground">
          Creá una cuenta corriente o de contado para un cliente.
        </p>
      </div>

      {clientes.length === 0 ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          No hay clientes registrados. Primero{" "}
          <Link href="/clientes/nuevo" className="underline font-medium">
            creá un cliente
          </Link>{" "}
          y luego volvé acá.
        </div>
      ) : (
        <FormularioCuenta clientes={clientes} onSubmit={accionCrear} />
      )}
    </div>
  )
}
