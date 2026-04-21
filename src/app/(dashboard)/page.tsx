import { auth } from "@/lib/auth"
import { Package, Tag, Ruler, Truck } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { prisma } from "@/lib/prisma"

export default async function DashboardPage() {
  const session = await auth()

  const [totalProductos, totalCategorias, totalUnidades, totalProveedores] =
    await Promise.all([
      prisma.producto.count({ where: { activo: true } }),
      prisma.categoria.count({ where: { activa: true } }),
      prisma.unidadMedida.count({ where: { activa: true } }),
      prisma.proveedor.count({ where: { activo: true } }),
    ])

  const stats = [
    {
      titulo: "Productos",
      valor: totalProductos,
      icono: Package,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      titulo: "Categorías",
      valor: totalCategorias,
      icono: Tag,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      titulo: "Unidades",
      valor: totalUnidades,
      icono: Ruler,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      titulo: "Proveedores",
      valor: totalProveedores,
      icono: Truck,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          Bienvenido, {session?.user?.name}
        </h1>
        <p className="text-sm text-slate-500 mt-1">Panel de control — Sistema Cono</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icono = stat.icono
          return (
            <Card key={stat.titulo}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">
                  {stat.titulo}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <span className="text-3xl font-bold text-slate-800">{stat.valor}</span>
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  <Icono className={`w-6 h-6 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardContent className="py-10 text-center text-slate-400">
          <p className="text-sm">
            Usá el menú lateral para navegar entre los módulos del sistema.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
