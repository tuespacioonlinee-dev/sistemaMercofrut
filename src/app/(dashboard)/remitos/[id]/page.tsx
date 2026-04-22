import { obtenerRemitoPorId } from "@/server/actions/remitos"
import { notFound } from "next/navigation"
import { formatearPesos } from "@/lib/utils"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, FileText } from "lucide-react"
import { AccionesRemito } from "../AccionesRemito"

export const dynamic = "force-dynamic"

const estadoBadge: Record<string, { label: string; className: string }> = {
  EMITIDO: { label: "Emitido", className: "bg-green-100 text-green-700 hover:bg-green-100" },
  ANULADO: { label: "Anulado", className: "bg-red-100 text-red-700 hover:bg-red-100" },
}

export default async function DetalleRemitoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const remitoRaw = await obtenerRemitoPorId(id)
  if (!remitoRaw) notFound()

  const remito = {
    ...remitoRaw,
    venta: {
      ...remitoRaw.venta,
      total: Number(remitoRaw.venta.total),
      subtotal: Number(remitoRaw.venta.subtotal),
      descuento: Number(remitoRaw.venta.descuento),
      detalles: remitoRaw.venta.detalles.map((d) => ({
        ...d,
        cantidad: Number(d.cantidad),
        precioUnitario: Number(d.precioUnitario),
        subtotal: Number(d.subtotal),
      })),
    },
  }

  const badge = estadoBadge[remito.estado] ?? estadoBadge.EMITIDO
  const v = remito.venta

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/remitos" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Volver
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <h1 className="text-2xl font-bold font-mono">{remito.numero}</h1>
              <Badge className={cn("text-xs ml-1", badge.className)}>{badge.label}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {new Date(remito.fecha).toLocaleDateString("es-AR", {
                weekday: "long",
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        {remito.estado === "EMITIDO" && (
          <AccionesRemito remitoId={remito.id} />
        )}
      </div>

      {/* Info venta */}
      <div className="border rounded-lg divide-y">
        <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Cliente</p>
            <p className="font-medium">{v.cliente.nombreRazonSocial}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">N° Venta</p>
            <Link href={`/ventas/${v.id}`} className="font-medium text-primary hover:underline">
              #{v.numero}
            </Link>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Condición</p>
            <p className="font-medium">
              {v.condicion === "CONTADO" ? "Contado" : "Cuenta corriente"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Emitido por</p>
            <p className="font-medium">{v.creadaPor.nombre}</p>
          </div>
        </div>

        {/* Items */}
        <div>
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left px-5 py-2.5 font-semibold text-muted-foreground">Producto</th>
                <th className="text-right px-5 py-2.5 font-semibold text-muted-foreground">Cantidad</th>
                <th className="text-right px-5 py-2.5 font-semibold text-muted-foreground">Precio unit.</th>
                <th className="text-right px-5 py-2.5 font-semibold text-muted-foreground">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {v.detalles.map((d) => (
                <tr key={d.id} className="hover:bg-muted/10">
                  <td className="px-5 py-3">
                    <p className="font-medium">{d.producto.nombre}</p>
                    <p className="text-xs text-muted-foreground">{d.producto.codigo}</p>
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    {d.cantidad.toLocaleString("es-AR", { maximumFractionDigits: 3 })} {d.unidad.abreviatura}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">
                    {formatearPesos(d.precioUnitario)}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums font-medium">
                    {formatearPesos(d.subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totales */}
        <div className="px-5 py-4 space-y-1 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatearPesos(v.subtotal)}</span>
          </div>
          {v.descuento > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Descuento</span>
              <span className="tabular-nums text-red-600">- {formatearPesos(v.descuento)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base pt-1 border-t mt-1">
            <span>Total</span>
            <span className="tabular-nums">{formatearPesos(v.total)}</span>
          </div>
        </div>
      </div>

      {/* Anulación */}
      {remito.estado === "ANULADO" && remito.motivoAnulacion && (
        <div className="border border-destructive/40 rounded-lg p-4 bg-destructive/5 text-sm">
          <p className="font-semibold text-destructive mb-1">Remito anulado</p>
          <p className="text-muted-foreground">
            <span className="font-medium">Motivo:</span> {remito.motivoAnulacion}
          </p>
          {remito.anuladoEn && (
            <p className="text-muted-foreground text-xs mt-1">
              {new Date(remito.anuladoEn).toLocaleString("es-AR")}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
