import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { obtenerMovimientosProducto } from "@/server/actions/stock"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { ArrowLeft, TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

const etiquetasTipo: Record<string, string> = {
  INGRESO_COMPRA: "Ingreso por compra",
  EGRESO_VENTA: "Egreso por venta",
  AJUSTE_POSITIVO: "Ajuste positivo",
  AJUSTE_NEGATIVO: "Ajuste negativo",
  DEVOLUCION_CLIENTE: "Devolución cliente",
  DEVOLUCION_PROVEEDOR: "Devolución proveedor",
}

const esIngreso = (tipo: string) =>
  tipo === "INGRESO_COMPRA" || tipo === "AJUSTE_POSITIVO" || tipo === "DEVOLUCION_CLIENTE"

interface Props {
  params: Promise<{ id: string }>
}

export default async function MovimientosProductoPage({ params }: Props) {
  const { id } = await params

  const producto = await prisma.producto.findFirst({
    where: { id, activo: true, deletedAt: null },
    select: { nombre: true, codigo: true, stockTotal: true, unidadBase: { select: { abreviatura: true } } },
  })
  if (!producto) notFound()

  const movimientos = await obtenerMovimientosProducto(id)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/stock" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Volver
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Movimientos — {producto.nombre}</h1>
          <p className="text-sm text-muted-foreground">
            {producto.codigo} · Stock actual: {Number(producto.stockTotal).toLocaleString("es-AR", { maximumFractionDigits: 3 })} {producto.unidadBase.abreviatura}
          </p>
        </div>
      </div>

      {movimientos.length === 0 ? (
        <div className="flex items-center justify-center py-16 border rounded-lg bg-muted/30">
          <p className="text-muted-foreground">No hay movimientos registrados para este producto.</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Fecha</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Tipo</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Cantidad</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Anterior</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Posterior</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Motivo</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Usuario</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {movimientos.map((m) => {
                const ingreso = esIngreso(m.tipo)
                return (
                  <tr key={m.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {format(new Date(m.fecha), "dd/MM/yyyy HH:mm", { locale: es })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("flex items-center gap-1.5", ingreso ? "text-green-700" : "text-red-600")}>
                        {ingreso ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                        {etiquetasTipo[m.tipo] ?? m.tipo}
                      </span>
                    </td>
                    <td className={cn("px-4 py-3 text-right font-semibold", ingreso ? "text-green-700" : "text-red-600")}>
                      {ingreso ? "+" : "-"}{Number(m.cantidad).toLocaleString("es-AR", { maximumFractionDigits: 3 })}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {Number(m.stockAnterior).toLocaleString("es-AR", { maximumFractionDigits: 3 })}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {Number(m.stockPosterior).toLocaleString("es-AR", { maximumFractionDigits: 3 })}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{m.motivo ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m.usuario.nombre}</td>
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
