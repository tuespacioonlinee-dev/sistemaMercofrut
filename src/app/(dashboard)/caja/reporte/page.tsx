import { obtenerCajaPorId } from "@/server/actions/caja"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { formatearPesos } from "@/lib/utils"
import { cn } from "@/lib/utils"
import {
  etiquetasCategoria,
  etiquetasTipo,
  type TipoMovCaja,
  type CategoriaMovCaja,
} from "@/lib/validaciones/caja"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { ArrowLeft, Printer } from "lucide-react"
import { PrintButton } from "./PrintButton"

export const dynamic = "force-dynamic"

const colorTipo: Record<TipoMovCaja, string> = {
  CONTADO_HABER: "text-green-700",
  CONTADO_DEBE:  "text-red-700",
  CC_HABER:      "text-blue-700",
  CC_DEBE:       "text-orange-700",
}

interface Props {
  searchParams: Promise<{ cajaId?: string }>
}

export default async function ReporteCajaPage({ searchParams }: Props) {
  const { cajaId } = await searchParams

  // Si no hay cajaId, buscar la última caja cerrada
  let id = cajaId
  if (!id) {
    const ultima = await prisma.cajaDiaria.findFirst({
      where: { estado: "CERRADA" },
      orderBy: { fechaApertura: "desc" },
    })
    id = ultima?.id
  }

  if (!id) {
    return (
      <div className="max-w-2xl mx-auto mt-16 text-center space-y-3">
        <p className="text-muted-foreground">No hay cajas cerradas para reportar.</p>
        <Link href="/caja" className={buttonVariants({ variant: "outline" })}>
          Volver
        </Link>
      </div>
    )
  }

  const cajaRaw = await obtenerCajaPorId(id)
  if (!cajaRaw) notFound()

  const params = await prisma.parametrosNegocio.findFirst({
    select: { nombreFantasia: true, razonSocial: true, cuit: true, direccion: true, localidad: true },
  })

  const movimientos = cajaRaw.movimientos

  const sumar = (tipo: TipoMovCaja) =>
    movimientos.filter((m) => m.tipo === tipo).reduce((a, m) => a + Number(m.monto), 0)

  const totalContadoHaber = Number(cajaRaw.totalContadoHaber ?? sumar("CONTADO_HABER"))
  const totalContadoDebe  = Number(cajaRaw.totalContadoDebe  ?? sumar("CONTADO_DEBE"))
  const totalCCHaber      = Number(cajaRaw.totalCCHaber      ?? sumar("CC_HABER"))
  const totalCCDebe       = Number(cajaRaw.totalCCDebe       ?? sumar("CC_DEBE"))
  const saldoFinal        = Number(cajaRaw.saldoFinal  ?? 0)
  const saldoArqueo       = Number(cajaRaw.saldoArqueo ?? 0)
  const diferencia        = Number(cajaRaw.diferencia  ?? 0)

  return (
    <div>
      {/* Controles — no se imprimen */}
      <div className="flex items-center gap-3 mb-6 print:hidden">
        <Link href="/caja/historial" className={buttonVariants({ variant: "outline", size: "sm" })}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Volver
        </Link>
        <PrintButton />
      </div>

      {/* ──────────────────────── REPORTE IMPRIMIBLE ──────────────────────── */}
      <div className="max-w-3xl mx-auto space-y-6 print:max-w-full print:space-y-4">

        {/* Encabezado */}
        <div className="text-center border-b pb-4">
          <p className="text-lg font-bold">{params?.nombreFantasia ?? "Sistema Cono"}</p>
          {params?.razonSocial && <p className="text-sm text-muted-foreground">{params.razonSocial} — CUIT {params.cuit}</p>}
          {params?.direccion && <p className="text-xs text-muted-foreground">{params.direccion}, {params.localidad}</p>}
          <p className="text-xl font-bold mt-3">Reporte de Caja Diaria</p>
          <p className="text-sm text-muted-foreground">
            {new Date(cajaRaw.fechaApertura).toLocaleDateString("es-AR", {
              weekday: "long", day: "2-digit", month: "long", year: "numeric",
            })}
          </p>
        </div>

        {/* Info de la caja */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Abierta por</p>
            <p className="font-medium">{cajaRaw.abiertaPor.nombre}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Cerrada por</p>
            <p className="font-medium">{cajaRaw.cerradaPor?.nombre ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Hora apertura</p>
            <p className="font-medium">
              {new Date(cajaRaw.fechaApertura).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Hora cierre</p>
            <p className="font-medium">
              {cajaRaw.fechaCierre
                ? new Date(cajaRaw.fechaCierre).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })
                : "—"}
            </p>
          </div>
        </div>

        {/* Resumen partida doble */}
        <div>
          <p className="font-semibold text-sm uppercase tracking-wide mb-2">Resumen contable</p>
          <table className="w-full text-sm border rounded-lg overflow-hidden">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2 font-semibold">Columna</th>
                <th className="text-right px-4 py-2 font-semibold">Importe</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr>
                <td className="px-4 py-2 text-green-700 font-medium">Contado HABER (ingresos efectivo)</td>
                <td className="px-4 py-2 text-right tabular-nums text-green-700 font-semibold">{formatearPesos(totalContadoHaber)}</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-red-700 font-medium">Contado DEBE (egresos efectivo)</td>
                <td className="px-4 py-2 text-right tabular-nums text-red-700 font-semibold">{formatearPesos(totalContadoDebe)}</td>
              </tr>
              <tr className="bg-muted/20">
                <td className="px-4 py-2 font-bold">Neto contado</td>
                <td className={cn("px-4 py-2 text-right tabular-nums font-bold", totalContadoHaber - totalContadoDebe >= 0 ? "text-green-700" : "text-red-700")}>
                  {formatearPesos(totalContadoHaber - totalContadoDebe)}
                </td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-blue-700 font-medium">CC HABER (cobros de clientes)</td>
                <td className="px-4 py-2 text-right tabular-nums text-blue-700 font-semibold">{formatearPesos(totalCCHaber)}</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-orange-700 font-medium">CC DEBE (pagos a proveedores)</td>
                <td className="px-4 py-2 text-right tabular-nums text-orange-700 font-semibold">{formatearPesos(totalCCDebe)}</td>
              </tr>
              <tr className="bg-muted/20">
                <td className="px-4 py-2 font-bold">Neto cuenta corriente</td>
                <td className={cn("px-4 py-2 text-right tabular-nums font-bold", totalCCHaber - totalCCDebe >= 0 ? "text-blue-700" : "text-orange-700")}>
                  {formatearPesos(totalCCHaber - totalCCDebe)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Saldos finales */}
        <div>
          <p className="font-semibold text-sm uppercase tracking-wide mb-2">Saldos</p>
          <table className="w-full text-sm border rounded-lg overflow-hidden">
            <tbody className="divide-y">
              <tr>
                <td className="px-4 py-2 text-muted-foreground">Saldo inicial</td>
                <td className="px-4 py-2 text-right tabular-nums font-medium">{formatearPesos(Number(cajaRaw.saldoInicial))}</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-muted-foreground">Saldo final teórico</td>
                <td className="px-4 py-2 text-right tabular-nums font-medium">{formatearPesos(saldoFinal)}</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-muted-foreground">Arqueo (dinero contado)</td>
                <td className="px-4 py-2 text-right tabular-nums font-medium">{formatearPesos(saldoArqueo)}</td>
              </tr>
              <tr className={cn("font-bold", diferencia === 0 ? "" : diferencia > 0 ? "bg-green-50" : "bg-red-50")}>
                <td className="px-4 py-2">Diferencia de arqueo</td>
                <td className={cn(
                  "px-4 py-2 text-right tabular-nums font-bold",
                  diferencia === 0 ? "text-muted-foreground" : diferencia > 0 ? "text-green-700" : "text-destructive"
                )}>
                  {diferencia > 0 ? "+" : ""}{formatearPesos(diferencia)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Detalle de movimientos */}
        <div>
          <p className="font-semibold text-sm uppercase tracking-wide mb-2">
            Detalle de movimientos ({movimientos.length})
          </p>
          {movimientos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin movimientos registrados.</p>
          ) : (
            <table className="w-full text-sm border rounded-lg overflow-hidden">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold">Hora</th>
                  <th className="text-left px-3 py-2 font-semibold">Categoría</th>
                  <th className="text-left px-3 py-2 font-semibold">Columna</th>
                  <th className="text-left px-3 py-2 font-semibold">Descripción</th>
                  <th className="text-left px-3 py-2 font-semibold">Usuario</th>
                  <th className="text-right px-3 py-2 font-semibold">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {movimientos.map((m) => (
                  <tr key={m.id}>
                    <td className="px-3 py-1.5 tabular-nums text-muted-foreground whitespace-nowrap">
                      {new Date(m.fecha).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-3 py-1.5 text-xs text-muted-foreground">
                      {etiquetasCategoria[m.categoria as CategoriaMovCaja] ?? m.categoria}
                    </td>
                    <td className={cn("px-3 py-1.5 text-xs font-semibold", colorTipo[m.tipo as TipoMovCaja])}>
                      {etiquetasTipo[m.tipo as TipoMovCaja] ?? m.tipo}
                    </td>
                    <td className="px-3 py-1.5 text-muted-foreground max-w-[200px] truncate">
                      {m.descripcion}
                    </td>
                    <td className="px-3 py-1.5 text-xs text-muted-foreground">{m.usuario.nombre}</td>
                    <td className={cn(
                      "px-3 py-1.5 text-right tabular-nums font-semibold",
                      m.tipo === "CONTADO_HABER" || m.tipo === "CC_HABER" ? "text-green-700" : "text-red-700"
                    )}>
                      {formatearPesos(Number(m.monto))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pie */}
        <div className="border-t pt-4 text-xs text-muted-foreground text-center print:mt-8">
          Reporte generado el{" "}
          {new Date().toLocaleString("es-AR", {
            day: "2-digit", month: "2-digit", year: "numeric",
            hour: "2-digit", minute: "2-digit",
          })}{" "}
          — Sistema Cono · Mercofrut Tucumán
        </div>
      </div>
    </div>
  )
}
