import { obtenerStockActual } from "@/server/actions/stock"
import { StockTable } from "./StockTable"
import { DescargarPDF } from "@/components/shared/DescargarPDF"
import { AlertTriangle } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function StockPage() {
  const productos = await obtenerStockActual()

  const bajosDeStock = productos.filter(
    (p) => Number(p.stockTotal) <= Number(p.stockMinimo) && Number(p.stockMinimo) > 0
  )

  const categorias = [...new Set(productos.map((p) => p.categoria.nombre))].sort()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Stock actual</h1>
          <p className="text-sm text-muted-foreground">{productos.length} productos activos</p>
        </div>
        <div className="flex items-center gap-3">
          {bajosDeStock.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{bajosDeStock.length} producto{bajosDeStock.length > 1 ? "s" : ""} bajo el mínimo</span>
          </div>
          )}
          <DescargarPDF href="/api/pdf/stock" label="Exportar PDF" />
        </div>
      </div>

      <StockTable productos={productos} categorias={categorias} />
    </div>
  )
}
