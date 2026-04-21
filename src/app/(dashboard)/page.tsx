import { auth } from "@/lib/auth"
import { Package, Tag, Ruler, Truck, Users, CreditCard } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { prisma } from "@/lib/prisma"

export default async function DashboardPage() {
  const session = await auth()

  const [totalProductos, totalCategorias, totalUnidades, totalProveedores, totalClientes, totalCuentas] =
    await Promise.all([
      prisma.producto.count({ where: { activo: true } }),
      prisma.categoria.count({ where: { activa: true } }),
      prisma.unidadMedida.count({ where: { activa: true } }),
      prisma.proveedor.count({ where: { activo: true } }),
      prisma.cliente.count({ where: { activo: true } }),
      prisma.cuenta.count({ where: { activa: true } }),
    ])

  const stats = [
    { titulo: "Productos", valor: totalProductos, icono: Package, color: "text-blue-600", bg: "bg-blue-50" },
    { titulo: "Categorías", valor: totalCategorias, icono: Tag, color: "text-green-600", bg: "bg-green-50" },
    { titulo: "Unidades", valor: totalUnidades, icono: Ruler, color: "text-purple-600", bg: "bg-purple-50" },
    { titulo: "Proveedores", valor: totalProveedores, icono: Truck, color: "text-orange-600", bg: "bg-orange-50" },
    { titulo: "Clientes", valor: totalClientes, icono: Users, color: "text-pink-600", bg: "bg-pink-50" },
    { titulo: "Cuentas", valor: totalCuentas, icono: CreditCard, color: "text-teal-600", bg: "bg-teal-50" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          Bienvenido, {session?.user?.name}
        </h1>
        <p className="text-sm text-slate-500 mt-1">Panel de control — Sistema Cono</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((stat) => {
          const Icono = stat.icono
          return (
            <Card key={stat.titulo}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-slate-500">{stat.titulo}</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <span className="text-2xl font-bold text-slate-800">{stat.valor}</span>
                <div className={`p-1.5 rounded-lg ${stat.bg}`}>
                  <Icono className={`w-5 h-5 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
