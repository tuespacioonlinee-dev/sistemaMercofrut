import { obtenerResumenStock, obtenerComprasPorMes, obtenerLotesCriticos } from "@/server/actions/reportes"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Package, TrendingDown, AlertTriangle, PackageX,
  ShoppingBag, Building2, CalendarClock, DollarSign,
} from "lucide-react"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

const $ar = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n)

export default async function ReportesPage() {
  const [stock, compras, lotesCriticos] = await Promise.all([
    obtenerResumenStock(),
    obtenerComprasPorMes(6),
    obtenerLotesCriticos(),
  ])

  const maxMes = Math.max(...compras.mesesData.map((m) => m.total), 1)
  const maxProv = Math.max(...compras.proveedoresData.map((p) => p.total), 1)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Reportes</h1>
        <p className="text-sm text-muted-foreground">Resumen operativo del sistema</p>
      </div>

      {/* ── KPIs de stock ──────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Stock</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Valor total</p>
                <p className="text-xl font-bold mt-0.5">{$ar(stock.totalValorizado)}</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-50">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Con stock</p>
                <p className="text-xl font-bold mt-0.5">{stock.productosConStock} / {stock.totalProductos}</p>
              </div>
              <div className="p-2 rounded-lg bg-green-50">
                <Package className="h-5 w-5 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Bajo mínimo</p>
                <p className="text-xl font-bold mt-0.5 text-amber-600">{stock.productosBajoMinimo}</p>
              </div>
              <div className="p-2 rounded-lg bg-amber-50">
                <TrendingDown className="h-5 w-5 text-amber-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Sin stock</p>
                <p className="text-xl font-bold mt-0.5 text-red-600">{stock.productosSinStock}</p>
              </div>
              <div className="p-2 rounded-lg bg-red-50">
                <PackageX className="h-5 w-5 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── Stock valorizado por producto ──────────────── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Stock valorizado por producto
        </h2>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Producto</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Categoría</th>
                    <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Stock</th>
                    <th className="text-right px-4 py-3 font-semibold text-muted-foreground">P. compra</th>
                    <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Valor</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {stock.items
                    .sort((a, b) => b.valorStock - a.valorStock)
                    .map((p) => (
                      <tr key={p.id} className={cn("hover:bg-muted/20", p.sinStock && "opacity-50")}>
                        <td className="px-4 py-2.5">
                          <p className="font-medium">{p.nombre}</p>
                          <p className="text-xs text-muted-foreground">{p.codigo}</p>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">{p.categoria}</td>
                        <td className="px-4 py-2.5 text-right">
                          {p.stock.toLocaleString("es-AR", { maximumFractionDigits: 3 })} {p.unidad}
                        </td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground">{$ar(p.precioCompra)}</td>
                        <td className="px-4 py-2.5 text-right font-semibold">{$ar(p.valorStock)}</td>
                        <td className="px-4 py-2.5">
                          {p.sinStock ? (
                            <Badge variant="destructive" className="text-xs">Sin stock</Badge>
                          ) : p.bajoMinimo ? (
                            <Badge className="text-xs bg-amber-100 text-amber-700 hover:bg-amber-100">Bajo mínimo</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs text-green-700 bg-green-50">OK</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
                <tfoot className="border-t bg-muted/30">
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-right font-semibold text-sm">Total valorizado</td>
                    <td className="px-4 py-3 text-right font-bold text-base">{$ar(stock.totalValorizado)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ── Compras ─────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Compras — últimos 6 meses
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Por mes */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                Por mes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {compras.mesesData.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Sin compras en el período.</p>
              ) : (
                compras.mesesData.map((m) => (
                  <div key={m.key} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="capitalize font-medium">{m.label}</span>
                      <span className="text-muted-foreground">{m.cantidad} compra{m.cantidad !== 1 ? "s" : ""} · <span className="font-semibold text-foreground">{$ar(m.total)}</span></span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${(m.total / maxMes) * 100}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
              {compras.mesesData.length > 0 && (
                <p className="text-right text-xs text-muted-foreground pt-1 border-t">
                  Total período: <span className="font-semibold text-foreground">{$ar(compras.totalPeriodo)}</span>
                </p>
              )}
            </CardContent>
          </Card>

          {/* Por proveedor */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                Por proveedor (top 10)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {compras.proveedoresData.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Sin compras en el período.</p>
              ) : (
                compras.proveedoresData.map((p) => (
                  <div key={p.nombre} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium truncate max-w-[180px]">{p.nombre}</span>
                      <span className="text-muted-foreground shrink-0 ml-2">{p.cantidad}x · <span className="font-semibold text-foreground">{$ar(p.total)}</span></span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-orange-400 transition-all"
                        style={{ width: `${(p.total / maxProv) * 100}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── Lotes críticos ──────────────────────────────── */}
      {lotesCriticos.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Lotes críticos (próximos 14 días o vencidos)
          </h2>
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Producto</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">N° Lote</th>
                    <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Cantidad</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {lotesCriticos.map((l) => (
                    <tr key={l.id} className={cn("hover:bg-muted/20", l.vencido && "bg-red-50/50")}>
                      <td className="px-4 py-2.5 font-medium">{l.producto.nombre}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{l.numeroLote ?? "—"}</td>
                      <td className="px-4 py-2.5 text-right">
                        {l.cantidadActual.toLocaleString("es-AR", { maximumFractionDigits: 3 })} {l.producto.unidadBase.abreviatura}
                      </td>
                      <td className="px-4 py-2.5">
                        {l.vencido ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
                            <PackageX className="h-3.5 w-3.5" /> Vencido
                          </span>
                        ) : (
                          <span className={cn(
                            "inline-flex items-center gap-1 text-xs font-medium",
                            l.diasRestantes <= 3 ? "text-red-500" : "text-amber-600"
                          )}>
                            <CalendarClock className="h-3.5 w-3.5" />
                            Vence en {l.diasRestantes}d
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  )
}
