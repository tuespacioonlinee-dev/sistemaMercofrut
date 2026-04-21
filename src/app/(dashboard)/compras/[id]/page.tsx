import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Props {
  params: Promise<{ id: string }>
}

export default async function DetalleCompraPage({ params }: Props) {
  const { id } = await params

  const compra = await prisma.compra.findUnique({
    where: { id },
    include: {
      proveedor: true,
      creadaPor: { select: { nombre: true } },
      detalles: {
        include: {
          producto: { select: { nombre: true, codigo: true } },
          unidad: { select: { abreviatura: true } },
        },
      },
    },
  })

  if (!compra) notFound()

  const formatPrecio = (val: unknown) =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(Number(val))

  const formatFecha = (d: Date) =>
    new Intl.DateTimeFormat("es-AR", { dateStyle: "long", timeStyle: "short" }).format(new Date(d))

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/compras"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Volver
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Detalle de Compra</h1>
          <p className="text-sm text-slate-500">{formatFecha(compra.fecha)}</p>
        </div>
        <Badge
          variant={
            compra.estado === "ANULADA"
              ? "destructive"
              : compra.estado === "RECIBIDA"
              ? "default"
              : "secondary"
          }
          className="ml-auto"
        >
          {compra.estado}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos generales</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-slate-500">Proveedor</p>
            <p className="font-medium">{compra.proveedor.nombreRazonSocial}</p>
          </div>
          <div>
            <p className="text-slate-500">Condición</p>
            <p className="font-medium">
              {compra.condicion === "CONTADO" ? "Contado" : "Cuenta Corriente"}
            </p>
          </div>
          <div>
            <p className="text-slate-500">N° Comprobante</p>
            <p className="font-medium font-mono">{compra.numeroComprobante ?? "—"}</p>
          </div>
          <div>
            <p className="text-slate-500">Registrado por</p>
            <p className="font-medium">{compra.creadaPor.nombre}</p>
          </div>
          {compra.observaciones && (
            <div className="col-span-2">
              <p className="text-slate-500">Observaciones</p>
              <p className="font-medium">{compra.observaciones}</p>
            </div>
          )}
          {compra.estado === "ANULADA" && (
            <div className="col-span-2 bg-red-50 rounded p-2">
              <p className="text-red-600 text-xs font-medium">
                Anulada el{" "}
                {compra.anuladaEn ? formatFecha(compra.anuladaEn) : "—"} — {compra.motivoAnulacion}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Productos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-slate-600">Producto</th>
                <th className="text-right px-4 py-2 font-medium text-slate-600">Cantidad</th>
                <th className="text-right px-4 py-2 font-medium text-slate-600">Precio unit.</th>
                <th className="text-right px-4 py-2 font-medium text-slate-600">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {compra.detalles.map((d) => (
                <tr key={d.id}>
                  <td className="px-4 py-2">
                    <p className="font-medium">{d.producto.nombre}</p>
                    <p className="text-xs text-slate-400 font-mono">{d.producto.codigo}</p>
                  </td>
                  <td className="px-4 py-2 text-right">
                    {Number(d.cantidad).toFixed(3)} {d.unidad.abreviatura}
                  </td>
                  <td className="px-4 py-2 text-right">{formatPrecio(d.precioUnitario)}</td>
                  <td className="px-4 py-2 text-right font-medium">{formatPrecio(d.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 flex flex-col items-end gap-1 text-sm">
          <div className="flex gap-16">
            <span className="text-slate-500">Subtotal</span>
            <span>{formatPrecio(compra.subtotal)}</span>
          </div>
          {Number(compra.descuento) > 0 && (
            <div className="flex gap-16">
              <span className="text-slate-500">Descuento</span>
              <span>- {formatPrecio(compra.descuento)}</span>
            </div>
          )}
          <div className="flex gap-16 pt-2 border-t font-bold text-base">
            <span>Total</span>
            <span>{formatPrecio(compra.total)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
