import { obtenerLotes } from "@/server/actions/lotes"
import { CerrarLoteButton } from "./CerrarLoteButton"
import { format, differenceInDays, isPast } from "date-fns"
import { es } from "date-fns/locale"
import { AlertTriangle, PackageX, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

function EstadoVencimiento({ fecha }: { fecha: Date | null }) {
  if (!fecha) return <span className="text-xs text-muted-foreground">Sin fecha</span>

  const diasRestantes = differenceInDays(fecha, new Date())
  const vencido = isPast(fecha)

  if (vencido) return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
      <PackageX className="h-3.5 w-3.5" />
      Vencido
    </span>
  )
  if (diasRestantes <= 3) return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-500">
      <AlertTriangle className="h-3.5 w-3.5" />
      Vence en {diasRestantes}d
    </span>
  )
  if (diasRestantes <= 7) return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
      <AlertTriangle className="h-3.5 w-3.5" />
      Vence en {diasRestantes}d
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-xs text-green-700">
      <CheckCircle2 className="h-3.5 w-3.5" />
      {diasRestantes}d
    </span>
  )
}

export default async function LotesPage() {
  const lotes = await obtenerLotes()

  const vencidos = lotes.filter((l) => l.fechaVencimiento && isPast(l.fechaVencimiento))
  const porVencer = lotes.filter((l) => {
    if (!l.fechaVencimiento || isPast(l.fechaVencimiento)) return false
    return differenceInDays(l.fechaVencimiento, new Date()) <= 7
  })

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Lotes activos</h1>
          <p className="text-sm text-muted-foreground">{lotes.length} lote{lotes.length !== 1 ? "s" : ""} en seguimiento</p>
        </div>
        <div className="flex gap-2">
          {vencidos.length > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700">
              <PackageX className="h-3.5 w-3.5" />
              {vencidos.length} vencido{vencidos.length > 1 ? "s" : ""}
            </div>
          )}
          {porVencer.length > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">
              <AlertTriangle className="h-3.5 w-3.5" />
              {porVencer.length} por vencer
            </div>
          )}
        </div>
      </div>

      {lotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border rounded-lg bg-muted/30">
          <p className="text-muted-foreground font-medium">No hay lotes activos.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Los lotes se crean automáticamente al registrar compras de productos con control de vencimiento.
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Producto</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">N° Lote</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Ingreso</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Vencimiento</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Estado</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Cantidad actual</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Inicial</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {lotes.map((lote) => {
                const vencido = lote.fechaVencimiento && isPast(lote.fechaVencimiento)
                const diasRestantes = lote.fechaVencimiento
                  ? differenceInDays(lote.fechaVencimiento, new Date())
                  : null
                const critico = diasRestantes !== null && diasRestantes <= 3 && !vencido

                return (
                  <tr
                    key={lote.id}
                    className={cn(
                      "hover:bg-muted/20 transition-colors",
                      vencido && "bg-red-50/60",
                      critico && "bg-amber-50/60"
                    )}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium">{lote.producto.nombre}</p>
                      <p className="text-xs text-muted-foreground">{lote.producto.categoria.nombre}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {lote.numeroLote ?? <span className="text-xs italic">Sin número</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {format(new Date(lote.fechaIngreso), "dd/MM/yyyy", { locale: es })}
                    </td>
                    <td className="px-4 py-3">
                      {lote.fechaVencimiento
                        ? format(new Date(lote.fechaVencimiento), "dd/MM/yyyy", { locale: es })
                        : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <EstadoVencimiento fecha={lote.fechaVencimiento ? new Date(lote.fechaVencimiento) : null} />
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {Number(lote.cantidadActual).toLocaleString("es-AR", { maximumFractionDigits: 3 })}{" "}
                      <span className="font-normal text-muted-foreground">{lote.producto.unidadBase.abreviatura}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {Number(lote.cantidadInicial).toLocaleString("es-AR", { maximumFractionDigits: 3 })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <CerrarLoteButton id={lote.id} />
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
