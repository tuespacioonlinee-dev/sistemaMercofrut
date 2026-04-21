import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { FormProveedor } from "../../FormProveedor"

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditarProveedorPage({ params }: Props) {
  const { id } = await params
  const proveedor = await prisma.proveedor.findUnique({ where: { id } })
  if (!proveedor) notFound()

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Editar Proveedor</h1>
        <p className="text-sm text-slate-500">{proveedor.nombreRazonSocial}</p>
      </div>
      <FormProveedor proveedor={proveedor} />
    </div>
  )
}
