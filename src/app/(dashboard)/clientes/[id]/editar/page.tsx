import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { FormularioCliente } from "../../FormularioCliente"
import { obtenerClientePorId, editarCliente } from "@/server/actions/clientes"
import { obtenerListasPrecios } from "@/server/actions/listas-precios"
import { DatosCliente } from "@/lib/validaciones/clientes"

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditarClientePage({ params }: Props) {
  const { id } = await params
  const [cliente, listasRaw] = await Promise.all([
    obtenerClientePorId(id),
    obtenerListasPrecios(),
  ])

  if (!cliente) notFound()

  const listas = listasRaw
    .filter((l) => l.activa)
    .map((l) => ({ id: l.id, nombre: l.nombre }))

  async function accionEditar(data: DatosCliente) {
    "use server"
    return editarCliente(id, data)
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
        <span className="text-foreground">Editar</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Editar cliente</h1>
        <p className="text-sm text-muted-foreground">
          Modificá los datos de <strong>{cliente.nombreRazonSocial}</strong>.
        </p>
      </div>

      <FormularioCliente
        modoEdicion
        onSubmit={accionEditar}
        listasPrecios={listas}
        valoresIniciales={{
          nombreRazonSocial: cliente.nombreRazonSocial,
          tipoDocumento: cliente.tipoDocumento,
          documento: cliente.documento,
          condicionIva: cliente.condicionIva,
          direccion: cliente.direccion ?? undefined,
          localidad: cliente.localidad ?? undefined,
          telefono: cliente.telefono ?? undefined,
          email: cliente.email ?? undefined,
          observaciones: cliente.observaciones ?? undefined,
          listaPrecioId: cliente.listaPrecioId ?? null,
        }}
      />
    </div>
  )
}
