import { obtenerFacturaPorId } from "@/server/actions/facturacion"
import { notFound } from "next/navigation"
import { formatearPesos } from "@/lib/utils"
import { cn } from "@/lib/utils"
import {
  etiquetasTipoFactura,
  etiquetasCondicionIva,
  TASA_IVA,
} from "@/lib/validaciones/facturacion"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Receipt } from "lucide-react"
import { AccionesFactura } from "../AccionesFactura"

export const dynamic = "force-dynamic"

const estadoBadge: Record<string, { label: string; className: string }> = {
  EMITIDA: { label: "Emitida", className: "bg-green-100 text-green-700 hover:bg-green-100" },
  ANULADA: { label: "Anulada", className: "bg-red-100 text-red-700 hover:bg-red-100" },
  RECHAZADA_ARCA: { label: "Rechazada ARCA", className: "bg-orange-100 text-orange-700 hover:bg-orange-100" },
}

const tipoBadgeClass: Record<string, string> = {
  A: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  B: "bg-purple-100 text-purple-700 hover:bg-purple-100",
  C: "bg-teal-100 text-teal-700 hover:bg-teal-100",
}

export default async function DetalleFacturaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const facturaRaw = await obtenerFacturaPorId(id)
  if (!facturaRaw) notFound()

  const factura = {
    ...facturaRaw,
    subtotal: Number(facturaRaw.subtotal),
    iva: Number(facturaRaw.iva),
    total: Number(facturaRaw.total),
    venta: {
      ...facturaRaw.venta,
      subtotal: Number(facturaRaw.venta.subtotal),
      descuento: Number(facturaRaw.venta.descuento),
      total: Number(facturaRaw.venta.total),
      detalles: facturaRaw.venta.detalles.map((d) => ({
        ...d,
        cantidad: Number(d.cantidad),
        precioUnitario: Number(d.precioUnitario),
        subtotal: Number(d.subtotal),
      })),
    },
  }

  const badge = estadoBadge[factura.estado] ?? estadoBadge.EMITIDA
  const tipoCls = tipoBadgeClass[factura.tipo] ?? tipoBadgeClass.C
  const v = factura.venta
  const esFacturaA = factura.tipo === "A"

  // Motivo anulación guardado en arcaRespuesta
  const motivoAnulacion =
    factura.estado === "ANULADA" && factura.arcaRespuesta
      ? (factura.arcaRespuesta as Record<string, string>).motivoAnulacion
      : null

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/facturacion" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Volver
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Receipt className="h-5 w-5 text-muted-foreground" />
              <h1 className="text-2xl font-bold font-mono">{factura.numero}</h1>
              <Badge className={cn("text-xs", tipoCls)}>
                {etiquetasTipoFactura[factura.tipo] ?? factura.tipo}
              </Badge>
              <Badge className={cn("text-xs", badge.className)}>{badge.label}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {new Date(factura.fechaEmision).toLocaleDateString("es-AR", {
                weekday: "long",
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        {factura.estado === "EMITIDA" && <AccionesFactura facturaId={factura.id} />}
      </div>

      {/* Info */}
      <div className="border rounded-lg divide-y">
        <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Cliente</p>
            <p className="font-medium">{v.cliente.nombreRazonSocial}</p>
            <p className="text-xs text-muted-foreground">
              {etiquetasCondicionIva[v.cliente.condicionIva] ?? v.cliente.condicionIva}
            </p>
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
          {factura.remito && (
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Remito asociado</p>
              <p className="font-mono font-medium">{factura.remito.numero}</p>
            </div>
          )}
          {factura.cae && (
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">CAE</p>
              <p className="font-mono text-xs">{factura.cae}</p>
            </div>
          )}
          {factura.caeVencimiento && (
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Vto. CAE</p>
              <p className="text-xs">
                {new Date(factura.caeVencimiento).toLocaleDateString("es-AR")}
              </p>
            </div>
          )}
        </div>

        {/* Ítems */}
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
            <span className="tabular-nums">{formatearPesos(factura.subtotal)}</span>
          </div>
          {v.descuento > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Descuento</span>
              <span className="tabular-nums text-red-600">- {formatearPesos(v.descuento)}</span>
            </div>
          )}
          {esFacturaA && factura.iva > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>IVA {Math.round(TASA_IVA * 100)}%</span>
              <span className="tabular-nums">{formatearPesos(factura.iva)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base pt-1 border-t mt-1">
            <span>Total</span>
            <span className="tabular-nums">{formatearPesos(factura.total)}</span>
          </div>
        </div>
      </div>

      {/* Sin CAE */}
      {factura.estado === "EMITIDA" && !factura.cae && (
        <div className="border border-amber-300 bg-amber-50 rounded-lg px-4 py-3 text-sm text-amber-800">
          <p className="font-semibold">Sin CAE</p>
          <p className="text-xs mt-0.5 text-amber-700">
            Factura registrada localmente. Sin envío a ARCA (AFIP) todavía.
          </p>
        </div>
      )}

      {/* Anulación */}
      {factura.estado === "ANULADA" && (
        <div className="border border-destructive/40 rounded-lg p-4 bg-destructive/5 text-sm">
          <p className="font-semibold text-destructive mb-1">Factura anulada</p>
          {motivoAnulacion && (
            <p className="text-muted-foreground">
              <span className="font-medium">Motivo:</span> {motivoAnulacion}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
