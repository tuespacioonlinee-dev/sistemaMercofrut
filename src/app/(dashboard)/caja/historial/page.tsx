import { obtenerHistorialCajas } from "@/server/actions/caja"
import { formatearPesos } from "@/lib/utils"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"

export const dynamic = "force-dynamic"

export default async function HistorialCajaPage() {
  const cajas = await obtenerHistorialCajas()

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/caja" className={buttonVariants({ variant: "outline", size: "sm" })}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Volver
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Historial de caja</h1>
          <p className="text-sm text-muted-foreground">Últimas 30 cajas cerradas</p>
        </div>
      </div>

      {cajas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border rounded-lg bg-muted/30 text-center">
          <p className="text-muted-foreground font-medium">No hay cajas cerradas todavía.</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Fecha apertura</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Fecha cierre</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Abierta por</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Cerrada por</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Saldo inicial</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Saldo final</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Arqueo</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Diferencia</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {cajas.map((caja) => {
                const diferencia = Number(caja.diferencia ?? 0)
                return (
                  <tr key={caja.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                      {new Date(caja.fechaApertura).toLocaleDateString("es-AR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums text-muted-foreground">
                      {caja.fechaCierre
                        ? new Date(caja.fechaCierre).toLocaleDateString("es-AR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{caja.abiertaPor.nombre}</td>
                    <td className="px-4 py-3 text-muted-foreground">{caja.cerradaPor?.nombre ?? "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatearPesos(Number(caja.saldoInicial))}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">
                      {caja.saldoFinal != null ? formatearPesos(Number(caja.saldoFinal)) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {caja.saldoArqueo != null ? formatearPesos(Number(caja.saldoArqueo)) : "—"}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-3 text-right tabular-nums font-semibold",
                        diferencia === 0
                          ? "text-muted-foreground"
                          : diferencia > 0
                          ? "text-green-700"
                          : "text-destructive"
                      )}
                    >
                      {diferencia > 0 ? "+" : ""}
                      {formatearPesos(diferencia)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/caja/reporte?cajaId=${caja.id}`}
                        className={buttonVariants({ variant: "ghost", size: "sm" })}
                      >
                        Reporte
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
