import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { FormularioCliente } from "../FormularioCliente"
import { crearCliente } from "@/server/actions/clientes"
import { DatosCliente } from "@/lib/validaciones/clientes"

export default function NuevoClientePage() {
  async function accionCrear(data: DatosCliente) {
    "use server"
    return crearCliente(data)
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      {/* Migas de pan */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/clientes" className="flex items-center gap-1 hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" />
          Clientes
        </Link>
        <span>/</span>
        <span className="text-foreground">Nuevo cliente</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Nuevo cliente</h1>
        <p className="text-sm text-muted-foreground">
          Completá los datos del cliente. Los campos marcados con * son obligatorios.
        </p>
      </div>

      <FormularioCliente onSubmit={accionCrear} />
    </div>
  )
}
