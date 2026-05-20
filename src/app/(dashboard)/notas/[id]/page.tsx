import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { obtenerNotaPorId } from "@/server/actions/notas"
import { Badge } from "@/components/ui/badge"
import { formatearPesos, cn } from "@/lib/utils"
import { DescargarNotaPDF } from "./DescargarNotaPDF"

interface Props {
  params: Promise<{ id: string }>
}

export default async function DetalleNotaPage({ params }: Props) {
  const { id } = await params
  const nota = await obtenerNotaPorId(id)
  if (!nota) notFound()

  const anulada = nota.estado === "ANULADA"
  const esCred  = nota.tipo === "CREDITO"

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href={`/ventas/${nota.ventaOrigen.id}`} className="flex items-center gap-1 hover:text-foreground">
          <ChevronLeft className="h-4 w-4" />
          Venta #{String(nota.ventaOrigen.numero).padStart(5, "0")}
        </Link>
        <span>/</span>
        <span className="text-foreground">{nota.numero}</span>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold">
              {esCred ? "Nota de crédito" : "Nota de débito"}
            </h1>
            <Badge variant={anulada ? "destructive" : esCred ? "secondary" : "default"}>
              {anulada ? "ANULADA" : nota.numero}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Emitida el{" "}
            {new Date(nota.fecha).toLocaleDateString("es-AR", {
              day: "2-digit", month: "long", year: "numeric",
            })}
            {" · "}
            Vendedor: {nota.creadaPor.nombre}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Monto total</p>
          <p className={cn(
            "text-3xl font-bold",
            esCred ? "text-green-700" : "text-destructive",
          )}>
            {esCred ? "−" : "+"}{formatearPesos(Number(nota.montoTotal))}
          </p>
        </div>
      </div>

      <div className="p-4 border rounded-lg bg-muted/30">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Cliente</p>
        <p className="font-semibold">{nota.cliente.nombreRazonSocial}</p>
        <p className="text-sm text-muted-foreground">{nota.cliente.documento}</p>
      </div>

      <div>
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Motivo</p>
        <p className="text-sm">{nota.motivo}</p>
      </div>

      <div>
        <h2 className="text-base font-semibold mb-2">Líneas</h2>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-semibold uppercase text-muted-foreground">Producto</th>
                <th className="text-right px-4 py-2 text-xs font-semibold uppercase text-muted-foreground">Cant.</th>
                <th className="text-right px-4 py-2 text-xs font-semibold uppercase text-muted-foreground">Precio</th>
                <th className="text-right px-4 py-2 text-xs font-semibold uppercase text-muted-foreground">Subtotal</th>
                <th className="text-center px-4 py-2 text-xs font-semibold uppercase text-muted-foreground">Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {nota.lineas.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-2">
                    <p className="font-medium">{l.producto.nombre}</p>
                    <p className="text-xs text-muted-foreground">
                      {l.producto.codigo} · {l.unidad.abreviatura}
                    </p>
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {Number(l.cantidad).toLocaleString("es-AR")}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {formatearPesos(Number(l.precioUnitario))}
                  </td>
                  <td className="px-4 py-2 text-right font-semibold tabular-nums">
                    {formatearPesos(Number(l.subtotal))}
                  </td>
                  <td className="px-4 py-2 text-center text-xs text-muted-foreground">
                    {l.generaMovimientoStock ? "✓ devuelto" : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex gap-2">
        <DescargarNotaPDF
          numero={nota.numero}
          tipo={nota.tipo}
          fecha={nota.fecha.toISOString()}
          cliente={nota.cliente.nombreRazonSocial}
          documento={nota.cliente.documento}
          motivo={nota.motivo}
          montoTotal={Number(nota.montoTotal)}
          lineas={nota.lineas.map((l) => ({
            producto: l.producto.nombre,
            unidad:   l.unidad.abreviatura,
            cantidad: Number(l.cantidad),
            precio:   Number(l.precioUnitario),
            subtotal: Number(l.subtotal),
          }))}
        />
      </div>

      {anulada && nota.motivoAnulacion && (
        <div className="p-4 border border-destructive/30 rounded-lg bg-destructive/5">
          <p className="text-xs text-destructive font-semibold uppercase tracking-wide mb-1">Motivo de anulación</p>
          <p className="text-sm text-destructive">{nota.motivoAnulacion}</p>
        </div>
      )}
    </div>
  )
}
