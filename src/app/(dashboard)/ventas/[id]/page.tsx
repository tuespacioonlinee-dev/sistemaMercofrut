import Link from "next/link"
import { notFound } from "next/navigation"
import { obtenerVentaPorId } from "@/server/actions/ventas"
import { Badge } from "@/components/ui/badge"
import { formatearPesos } from "@/lib/utils"
import { ChevronLeft } from "lucide-react"

interface Props {
  params: Promise<{ id: string }>
}

const etiquetasCondicion: Record<string, string> = {
  CONTADO: "Contado",
  CUENTA_CORRIENTE: "Cuenta Corriente",
}

const etiquetasEstado: Record<string, string> = {
  CONFIRMADA: "Confirmada",
  PENDIENTE: "Pendiente",
  ANULADA: "Anulada",
}

export default async function DetalleVentaPage({ params }: Props) {
  const { id } = await params
  const venta = await obtenerVentaPorId(id)
  if (!venta) notFound()

  const anulada = venta.estado === "ANULADA"

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Migas de pan */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/ventas" className="flex items-center gap-1 hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" />
          Ventas
        </Link>
        <span>/</span>
        <span className="text-foreground">#{String(venta.numero).padStart(5, "0")}</span>
      </div>

      {/* Encabezado */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Venta #{String(venta.numero).padStart(5, "0")}</h1>
            <Badge variant={anulada ? "destructive" : "secondary"}>
              {etiquetasEstado[venta.estado]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {new Date(venta.fecha).toLocaleDateString("es-AR", {
              weekday: "long", year: "numeric", month: "long", day: "numeric",
            })}
            {" · "}Vendedor: {venta.creadaPor.nombre}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-3xl font-bold">{formatearPesos(Number(venta.total))}</p>
        </div>
      </div>

      {/* Info del cliente */}
      <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/30">
        <div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Cliente</p>
          <p className="font-semibold">{venta.cliente.nombreRazonSocial}</p>
          <p className="text-sm text-muted-foreground">{venta.cliente.documento}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Condición de venta</p>
          <Badge variant="outline">{etiquetasCondicion[venta.condicion]}</Badge>
        </div>
      </div>

      {/* Ítems */}
      <div>
        <h2 className="text-base font-semibold mb-3">Productos</h2>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Producto</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Cantidad</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Precio unit.</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {venta.detalles.map((d) => (
                <tr key={d.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{d.producto.nombre}</p>
                    <p className="text-xs text-muted-foreground">{d.producto.codigo}</p>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {Number(d.cantidad).toLocaleString("es-AR")} {d.unidad.abreviatura}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatearPesos(Number(d.precioUnitario))}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">
                    {formatearPesos(Number(d.subtotal))}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t bg-muted/30">
              <tr>
                <td colSpan={3} className="px-4 py-2 text-right text-sm text-muted-foreground">Subtotal</td>
                <td className="px-4 py-2 text-right tabular-nums">{formatearPesos(Number(venta.subtotal))}</td>
              </tr>
              {Number(venta.descuento) > 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-2 text-right text-sm text-muted-foreground">Descuento</td>
                  <td className="px-4 py-2 text-right tabular-nums text-destructive">
                    - {formatearPesos(Number(venta.descuento))}
                  </td>
                </tr>
              )}
              <tr className="font-bold">
                <td colSpan={3} className="px-4 py-2 text-right">Total</td>
                <td className="px-4 py-2 text-right tabular-nums">{formatearPesos(Number(venta.total))}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Observaciones */}
      {venta.observaciones && (
        <div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Observaciones</p>
          <p className="text-sm text-foreground">{venta.observaciones}</p>
        </div>
      )}

      {/* Motivo de anulación */}
      {anulada && venta.motivoAnulacion && (
        <div className="p-4 border border-destructive/30 rounded-lg bg-destructive/5">
          <p className="text-xs text-destructive font-semibold uppercase tracking-wide mb-1">Motivo de anulación</p>
          <p className="text-sm text-destructive">{venta.motivoAnulacion}</p>
        </div>
      )}
    </div>
  )
}
