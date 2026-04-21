import Link from "next/link"
import { obtenerClientes } from "@/server/actions/clientes"
import { buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { etiquetasCondicionIva, etiquetasTipoDocumento } from "@/lib/validaciones/clientes"
import { UserPlus } from "lucide-react"
import { AccionesCliente } from "./AccionesCliente"

export default async function ClientesPage() {
  const clientes = await obtenerClientes()

  return (
    <div className="p-6 space-y-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            {clientes.length} cliente{clientes.length !== 1 ? "s" : ""} registrado{clientes.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/clientes/nuevo" className={buttonVariants()}>
          <UserPlus className="h-4 w-4 mr-2" />
          Nuevo cliente
        </Link>
      </div>

      {/* Tabla */}
      {clientes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border rounded-lg bg-muted/30">
          <p className="text-muted-foreground font-medium">No hay clientes registrados todavía.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Hacé clic en &quot;Nuevo cliente&quot; para agregar el primero.
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Nombre / Razón Social</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Documento</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Condición IVA</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Teléfono</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Localidad</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {clientes.map((cliente) => (
                <tr key={cliente.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{cliente.nombreRazonSocial}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {etiquetasTipoDocumento[cliente.tipoDocumento]} {cliente.documento}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className="font-normal">
                      {etiquetasCondicionIva[cliente.condicionIva]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {cliente.telefono ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {cliente.localidad ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <AccionesCliente id={cliente.id} nombre={cliente.nombreRazonSocial} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
