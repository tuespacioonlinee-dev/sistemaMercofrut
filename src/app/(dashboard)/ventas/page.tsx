import Link from "next/link"
import { obtenerVentas } from "@/server/actions/ventas"
import { buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatearPesos } from "@/lib/utils"
import { ShoppingCart } from "lucide-react"
import { AccionesVenta } from "./AccionesVenta"

export const dynamic = "force-dynamic"

const etiquetasCondicion: Record<string, string> = {
  CONTADO:          "Contado",
  CUENTA_CORRIENTE: "Cta. Cte.",
}

export default async function VentasPage() {
  const ventas = await obtenerVentas()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ventas</h1>
          <p className="text-sm text-muted-foreground">
            {ventas.length} venta{ventas.length !== 1 ? "s" : ""} registrada{ventas.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/ventas/nueva" className={buttonVariants()}>
          <ShoppingCart className="h-4 w-4 mr-2" />
          Nueva venta
        </Link>
      </div>

      {ventas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border rounded-lg bg-muted/30">
          <p className="text-muted-foreground font-medium">No hay ventas registradas todavía.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Hacé clic en &quot;Nueva venta&quot; para registrar la primera.
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">#</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Fecha</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Cliente</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Condición</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Vendedor</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Remito</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Total</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {ventas.map((venta) => {
                const remito = venta.remitos.find((r) => r.estado !== "ANULADO") ?? venta.remitos[0]
                return (
                  <tr key={venta.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-mono text-muted-foreground">
                      #{String(venta.numero).padStart(5, "0")}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {new Date(venta.fecha).toLocaleDateString("es-AR")}
                    </td>
                    <td className="px-4 py-3 font-medium">{venta.cliente.nombreRazonSocial}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="font-normal">
                        {etiquetasCondicion[venta.condicion]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{venta.creadaPor.nombre}</td>
                    <td className="px-4 py-3">
                      {remito ? (
                        <Link
                          href={`/remitos/${remito.id}`}
                          className="font-mono text-primary hover:underline text-xs"
                        >
                          {remito.numero}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      {formatearPesos(Number(venta.total))}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <AccionesVenta
                        id={venta.id}
                        numero={venta.numero}
                        remitoId={remito?.id}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
