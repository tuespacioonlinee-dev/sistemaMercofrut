import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { obtenerClientes } from "@/server/actions/clientes"
import { prisma } from "@/lib/prisma"
import { FormVenta } from "./FormVenta"
import { crearVenta } from "@/server/actions/ventas"
import { VentaInput } from "@/lib/validaciones/ventas"

export default async function NuevaVentaPage() {
  const [clientes, productos, unidades] = await Promise.all([
    obtenerClientes(),
    prisma.producto.findMany({
      where: { activo: true, deletedAt: null },
      include: { unidadBase: true, unidadesAlternativas: { include: { unidad: true } } },
      orderBy: { nombre: "asc" },
    }),
    prisma.unidadMedida.findMany({ where: { activa: true }, orderBy: { nombre: "asc" } }),
  ])

  async function accionCrear(data: VentaInput) {
    "use server"
    return crearVenta(data)
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/ventas" className="flex items-center gap-1 hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" />
          Ventas
        </Link>
        <span>/</span>
        <span className="text-foreground">Nueva venta</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Nueva venta</h1>
        <p className="text-sm text-muted-foreground">
          Seleccioná el cliente, agregá los productos y confirmá la venta.
        </p>
      </div>

      <FormVenta
        clientes={clientes}
        productos={productos}
        unidades={unidades}
        onSubmit={accionCrear}
      />
    </div>
  )
}
