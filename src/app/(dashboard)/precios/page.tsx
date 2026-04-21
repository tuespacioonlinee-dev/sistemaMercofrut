import { prisma } from "@/lib/prisma"
import { TablaPrecios } from "./TablaPrecios"

export const dynamic = "force-dynamic"

export default async function PreciosPage() {
  const productosRaw = await prisma.producto.findMany({
    where: { activo: true, deletedAt: null },
    select: {
      id: true,
      codigo: true,
      nombre: true,
      precioVenta: true,
      precioCompra: true,
      categoria: { select: { nombre: true } },
    },
    orderBy: { nombre: "asc" },
  })

  const productos = productosRaw.map((p) => ({
    id: p.id,
    codigo: p.codigo,
    nombre: p.nombre,
    precioVenta: Number(p.precioVenta),
    precioCompra: Number(p.precioCompra),
    categoria: p.categoria.nombre,
  }))

  const categorias = [...new Set(productos.map((p) => p.categoria))].sort()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Actualización de precios</h1>
        <p className="text-sm text-muted-foreground">
          Editá precios de compra y venta de todos los productos. Los cambios se guardan en lote.
        </p>
      </div>
      <TablaPrecios productos={productos} categorias={categorias} />
    </div>
  )
}
