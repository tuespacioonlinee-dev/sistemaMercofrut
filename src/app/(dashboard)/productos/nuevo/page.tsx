import { prisma } from "@/lib/prisma"
import { FormProducto } from "../FormProducto"

export default async function NuevoProductoPage() {
  const [categorias, unidades] = await Promise.all([
    prisma.categoria.findMany({ where: { activa: true }, orderBy: { nombre: "asc" } }),
    prisma.unidadMedida.findMany({ where: { activa: true }, orderBy: { nombre: "asc" } }),
  ])

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Nuevo Producto</h1>
        <p className="text-sm text-slate-500">Completá los datos del producto</p>
      </div>
      <FormProducto categorias={categorias} unidades={unidades} />
    </div>
  )
}
