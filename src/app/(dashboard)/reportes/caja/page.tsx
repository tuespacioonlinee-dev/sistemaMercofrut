import { obtenerCajasList, obtenerReporteCaja } from "@/server/actions/reportes"
import { formatearPesos } from "@/lib/utils"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { type CategoriaMovCaja, etiquetasCategoria } from "@/lib/validaciones/caja"

export const dynamic = "force-dynamic"

interface Props {
  searchParams: Promise<{ cajaId?: string }>
}

export default async function ReporteCajaPage({ searchParams }: Props) {
  const { cajaId } = await searchParams
  const [reporte, cajas] = await Promise.all([
    obtenerReporteCaja(cajaId),
    obtenerCajasList(),
  ])

  const fmt = (d: Date) =>
    new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/reportes" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Reportes
        </Link>
        <h1 className="text-2xl font-bold">Reporte de Caja</h1>
      </div>

      {/* Selector de caja */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium">Caja:</label>
        <div className="flex gap-2 flex-wrap">
          {cajas.map((c) => (
            <Link
              key={c.id}
              href={`/reportes/caja?cajaId=${c.id}`}
              className={cn(
                buttonVariants({ variant: c.id === (cajaId ?? reporte?.caja.id) ? "default" : "outline", size: "sm" }),
                "h-7 px-3 text-xs"
              )}
            >
              {fmt(c.fechaApertura)} {c.estado === "ABIERTA" && "🟢"}
            </Link>
          ))}
        </div>
      </div>

      {!reporte ? (
        <div className="border rounded-lg p-12 text-center text-muted-foreground">
          No hay cajas registradas todavía.
        </div>
      ) : (
        <>
          {/* Resumen */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 text-sm">
            <div className="border rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Saldo inicial</p>
              <p className="font-bold text-lg">{formatearPesos(Number(reporte.caja.saldoInicial))}</p>
            </div>
            <div className="border rounded-lg p-3 bg-green-50/50">
              <p className="text-xs text-green-700 font-medium">Ingresos</p>
              <p className="font-bold text-lg text-green-700">{formatearPesos(reporte.totalIngresos)}</p>
            </div>
            <div className="border rounded-lg p-3 bg-red-50/50">
              <p className="text-xs text-red-700 font-medium">Egresos</p>
              <p className="font-bold text-lg text-red-700">{formatearPesos(reporte.totalEgresos)}</p>
            </div>
            <div className="border rounded-lg p-3 bg-orange-50/50">
              <p className="text-xs text-orange-700 font-medium">Debe CC</p>
              <p className="font-bold text-lg text-orange-700">{formatearPesos(reporte.totalDebe)}</p>
            </div>
            <div className="border rounded-lg p-3 bg-blue-50/50">
              <p className="text-xs text-blue-700 font-medium">Haber CC</p>
              <p className="font-bold text-lg text-blue-700">{formatearPesos(reporte.totalHaber)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="border rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Saldo caja efectivo</p>
              <p className="font-bold text-xl">
                {formatearPesos(Number(reporte.caja.saldoInicial) + reporte.totalIngresos - reporte.totalEgresos)}
              </p>
            </div>
            <div className="border rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Neto CC</p>
              <p className="font-bold text-xl">
                {formatearPesos(reporte.totalHaber - reporte.totalDebe)}
              </p>
            </div>
          </div>

          {/* Tabla de movimientos */}
          <div className="border rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-muted/40 border-b font-semibold text-sm">
              Movimientos ({reporte.movimientos.length})
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/20">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground w-8">#</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Concepto</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Hora</th>
                    <th className="text-right px-3 py-2 font-medium text-green-700">Ingresos</th>
                    <th className="text-right px-3 py-2 font-medium text-red-700">Egresos</th>
                    <th className="text-right px-3 py-2 font-medium text-orange-700">Debe</th>
                    <th className="text-right px-3 py-2 font-medium text-blue-700">Haber</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {reporte.movimientos.map((m, i) => (
                    <tr key={m.id} className="hover:bg-muted/10">
                      <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-2">
                        <p className="font-medium">{m.descripcion}</p>
                        <p className="text-xs text-muted-foreground">
                          {etiquetasCategoria[m.categoria as CategoriaMovCaja] ?? m.categoria} · {m.usuario.nombre}
                        </p>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground text-xs whitespace-nowrap">
                        {new Date(m.fecha).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-green-700 font-semibold">
                        {m.tipo === "CONTADO_HABER" ? formatearPesos(m.monto) : ""}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-red-700 font-semibold">
                        {m.tipo === "CONTADO_DEBE" ? formatearPesos(m.monto) : ""}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-orange-700 font-semibold">
                        {m.tipo === "CC_DEBE" ? formatearPesos(m.monto) : ""}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-blue-700 font-semibold">
                        {m.tipo === "CC_HABER" ? formatearPesos(m.monto) : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t bg-muted/20 font-semibold">
                  <tr>
                    <td colSpan={3} className="px-3 py-2 text-right text-muted-foreground text-xs">Totales</td>
                    <td className="px-3 py-2 text-right tabular-nums text-green-700">{formatearPesos(reporte.totalIngresos)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-red-700">{formatearPesos(reporte.totalEgresos)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-orange-700">{formatearPesos(reporte.totalDebe)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-blue-700">{formatearPesos(reporte.totalHaber)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
