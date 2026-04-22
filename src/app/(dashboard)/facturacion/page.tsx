import { obtenerFacturas } from "@/server/actions/facturacion"
import { formatearPesos } from "@/lib/utils"
import { etiquetasTipoFactura } from "@/lib/validaciones/facturacion"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, AlertTriangle } from "lucide-react"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

const estadoBadge: Record<string, { label: string; className: string }> = {
  EMITIDA: { label: "Emitida", className: "bg-green-100 text-green-700 hover:bg-green-100" },
  ANULADA: { label: "Anulada", className: "bg-red-100 text-red-700 hover:bg-red-100" },
  RECHAZADA_ARCA: { label: "Rechazada ARCA", className: "bg-orange-100 text-orange-700 hover:bg-orange-100" },
}

const tipoBadge: Record<string, string> = {
  A: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  B: "bg-purple-100 text-purple-700 hover:bg-purple-100",
  C: "bg-teal-100 text-teal-700 hover:bg-teal-100",
}

export default async function FacturacionPage() {
  const [facturasRaw, params] = await Promise.all([
    obtenerFacturas(),
    prisma.parametrosNegocio.findFirst({ select: { facturacionHabilitada: true } }),
  ])

  const facturas = facturasRaw.map((f) => ({
    ...f,
    subtotal: Number(f.subtotal),
    iva: Number(f.iva),
    total: Number(f.total),
    venta: {
      ...f.venta,
      total: Number(f.venta.total),
    },
  }))

  const facturacionHabilitada = params?.facturacionHabilitada ?? false

  return (
    <div className="space-y-4">
      {/* Banner AFIP */}
      {!facturacionHabilitada && (
        <div className="flex items-start gap-3 border border-amber-300 bg-amber-50 rounded-lg px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" />
          <div>
            <p className="font-semibold">Facturación electrónica no habilitada</p>
            <p className="text-amber-700 text-xs mt-0.5">
              Las facturas se registran localmente sin envío a ARCA (AFIP).
              Activá la facturación electrónica en{" "}
              <Link href="/parametros" className="underline font-medium">
                Parámetros
              </Link>
              .
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Facturación</h1>
          <p className="text-sm text-muted-foreground">
            {facturas.length} comprobante{facturas.length !== 1 ? "s" : ""} registrado{facturas.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/facturacion/nueva" className={buttonVariants()}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva factura
        </Link>
      </div>

      {facturas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border rounded-lg bg-muted/30 text-center gap-3">
          <p className="text-muted-foreground font-medium">No hay comprobantes registrados todavía.</p>
          <Link href="/facturacion/nueva" className={buttonVariants({ variant: "outline" })}>
            Emitir la primera factura
          </Link>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">N° Factura</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Tipo</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Fecha</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Cliente</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">N° Venta</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Subtotal</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">IVA</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Total</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {facturas.map((f) => {
                const badge = estadoBadge[f.estado] ?? estadoBadge.EMITIDA
                const tipoCls = tipoBadge[f.tipo] ?? tipoBadge.C
                return (
                  <tr
                    key={f.id}
                    className={cn(
                      "hover:bg-muted/20 transition-colors",
                      f.estado === "ANULADA" && "opacity-50"
                    )}
                  >
                    <td className="px-4 py-3 font-mono font-semibold">{f.numero}</td>
                    <td className="px-4 py-3">
                      <Badge className={cn("text-xs", tipoCls)}>
                        {etiquetasTipoFactura[f.tipo] ?? f.tipo}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground whitespace-nowrap">
                      {new Date(f.fechaEmision).toLocaleDateString("es-AR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 font-medium">{f.venta.cliente.nombreRazonSocial}</td>
                    <td className="px-4 py-3 text-muted-foreground">#{f.venta.numero}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {formatearPesos(f.subtotal)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {f.iva > 0 ? formatearPesos(f.iva) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">
                      {formatearPesos(f.total)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={cn("text-xs", badge.className)}>{badge.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/facturacion/${f.id}`}
                        className={buttonVariants({ variant: "ghost", size: "sm" })}
                      >
                        Ver
                      </Link>
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
