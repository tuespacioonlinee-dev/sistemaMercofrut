import { obtenerStockActual } from "@/server/actions/stock"
import { AjusteStockModal } from "./AjusteStockModal"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { History, AlertTriangle } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { differenceInDays } from "date-fns"

export const dynamic = "force-dynamic"

export default async function StockPage() {
  const productos = await obtenerStockActual()

  const bajosDeStock = productos.filter((p) => Number(p.stockTotal) <= Number(p.stockMinimo) && Number(p.stockMinimo) > 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Stock actual</h1>
          <p className="text-sm text-muted-foreground">{productos.length} productos activos</p>
        </div>
        {bajosDeStock.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{bajosDeStock.length} producto{bajosDeStock.length > 1 ? "s" : ""} bajo el mínimo</span>
          </div>
        )}
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Producto</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Categoría</th>
              <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Stock actual</th>
              <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Mínimo</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Estado</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Vencimientos</th>
              <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {productos.map((p) => {
              const stock = Number(p.stockTotal)
              const minimo = Number(p.stockMinimo)
              const bajoDeMin = minimo > 0 && stock <= minimo
              const sinStock = stock === 0

              const lotesProximos = p.lotes.filter((l) => {
                if (!l.fechaVencimiento) return false
                return differenceInDays(new Date(l.fechaVencimiento), new Date()) <= 7
              })

              return (
                <tr key={p.id} className={cn("hover:bg-muted/20 transition-colors", bajoDeMin && "bg-amber-50/50")}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{p.nombre}</p>
                    <p className="text-xs text-muted-foreground">{p.codigo}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{p.categoria.nombre}</td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {stock.toLocaleString("es-AR", { maximumFractionDigits: 3 })} {p.unidadBase.abreviatura}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {minimo > 0
                      ? `${minimo.toLocaleString("es-AR", { maximumFractionDigits: 3 })} ${p.unidadBase.abreviatura}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {sinStock ? (
                      <Badge variant="destructive">Sin stock</Badge>
                    ) : bajoDeMin ? (
                      <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Bajo mínimo</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-green-700 bg-green-50">OK</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {p.controlaVencimiento && lotesProximos.length > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {lotesProximos.length} lote{lotesProximos.length > 1 ? "s" : ""} por vencer
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <AjusteStockModal
                        productoId={p.id}
                        nombreProducto={p.nombre}
                        stockActual={stock}
                        unidad={p.unidadBase.abreviatura}
                      />
                      <Link
                        href={`/stock/${p.id}/movimientos`}
                        className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                        title="Ver movimientos"
                      >
                        <History className="h-4 w-4" />
                        <span className="sr-only">Movimientos</span>
                      </Link>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
