import { prisma } from "@/lib/prisma"
import { FormCompra } from "./FormCompra"

export default async function NuevaCompraPage() {
  const [proveedores, productosRaw, unidades] = await Promise.all([
    prisma.proveedor.findMany({
      where: { activo: true },
      orderBy: { nombreRazonSocial: "asc" },
    }),
    prisma.producto.findMany({
      where: { activo: true },
      include: { unidadBase: { select: { id: true, nombre: true, abreviatura: true } } },
      orderBy: { nombre: "asc" },
    }),
    prisma.unidadMedida.findMany({
      where: { activa: true },
      orderBy: { nombre: "asc" },
    }),
  ])

  const productos = productosRaw.map((p) => ({
    ...p,
    precioVenta: Number(p.precioVenta),
    precioCompra: Number(p.precioCompra),
    stockTotal: Number(p.stockTotal),
    stockMinimo: Number(p.stockMinimo),
  }))

  return (
    <div className="max-w-4xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Nueva Compra</h1>
        <p className="text-sm text-slate-500">Registrá el ingreso de mercadería</p>
      </div>
      <FormCompra proveedores={proveedores} productos={productos} unidades={unidades} />
    </div>
  )
}
