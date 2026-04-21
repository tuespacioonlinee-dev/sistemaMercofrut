import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { FormProducto } from "../../FormProducto"

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditarProductoPage({ params }: Props) {
  const { id } = await params

  const [producto, categorias, unidades] = await Promise.all([
    prisma.producto.findUnique({ where: { id } }),
    prisma.categoria.findMany({ where: { activa: true }, orderBy: { nombre: "asc" } }),
    prisma.unidadMedida.findMany({ where: { activa: true }, orderBy: { nombre: "asc" } }),
  ])

  if (!producto) notFound()

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Editar Producto</h1>
        <p className="text-sm text-slate-500">{producto.nombre}</p>
      </div>
      <FormProducto categorias={categorias} unidades={unidades} producto={producto} />
    </div>
  )
}
