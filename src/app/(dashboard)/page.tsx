import { auth } from "@/lib/auth"
import Link from "next/link"
import { Package, Tag, Ruler, Truck, Users, CreditCard, AlertTriangle, CalendarClock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { prisma } from "@/lib/prisma"
import { getEmpresa } from "@/lib/empresa"
import { obtenerLotesCriticos } from "@/server/actions/reportes"

export default async function DashboardPage() {
  const session = await auth()
  const empresa = await getEmpresa()

  const [totalProductos, totalCategorias, totalUnidades, totalProveedores, totalClientes, totalCuentas, lotesCriticos] =
    await Promise.all([
      prisma.producto.count({ where: { activo: true } }),
      prisma.categoria.count({ where: { activa: true } }),
      prisma.unidadMedida.count({ where: { activa: true } }),
      prisma.proveedor.count({ where: { activo: true } }),
      prisma.cliente.count({ where: { activo: true } }),
      prisma.cuenta.count({ where: { activa: true } }),
      obtenerLotesCriticos(),
    ])

  const lotesVencidos    = lotesCriticos.filter((l) => l.vencido)
  const lotesPorVencer   = lotesCriticos.filter((l) => !l.vencido)

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
        <p className="text-sm text-slate-500 mt-1">Panel de control — {empresa.nombreFantasia}</p>
      </div>

      {/* Alerta de vencimientos */}
      {lotesCriticos.length > 0 && (
        <Link
          href="/lotes"
          className="block rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 hover:bg-amber-100 transition-colors"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div className="flex-1 text-sm">
              <p className="font-semibold text-amber-900">
                Lotes que requieren atención
              </p>
              <p className="text-amber-800 mt-0.5">
                {lotesVencidos.length > 0 && (
                  <>
                    <strong>{lotesVencidos.length}</strong>{" "}
                    {lotesVencidos.length === 1 ? "lote vencido" : "lotes vencidos"}
                  </>
                )}
                {lotesVencidos.length > 0 && lotesPorVencer.length > 0 && " · "}
                {lotesPorVencer.length > 0 && (
                  <>
                    <strong>{lotesPorVencer.length}</strong> por vencer en los próximos 14 días
                  </>
                )}
              </p>
            </div>
            <CalendarClock className="h-4 w-4 text-amber-600 shrink-0" />
          </div>
        </Link>
      )}

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
