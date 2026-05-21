import { obtenerCajaAbierta } from "@/server/actions/caja"
import { abrirCaja, cerrarCaja, registrarMovimiento } from "@/server/actions/caja"
import { obtenerCuentasConSaldo } from "@/server/actions/reportes"
import { formatearPesos } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { type TipoMovCaja, type CategoriaMovCaja, etiquetasCategoria } from "@/lib/validaciones/caja"
import { FormAperturaCaja } from "./FormAperturaCaja"
import { FormMovimiento } from "./FormMovimiento"
import { FormCierreCaja } from "./FormCierreCaja"
import { OfflineGuard } from "@/components/shared/OfflineGuard"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { History } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function CajaPage() {
  return (
    <OfflineGuard motivo="La gestión de caja requiere registrar movimientos en tiempo real contra el servidor.">
      <CajaPageInner />
    </OfflineGuard>
  )
}

async function CajaPageInner() {
  const caja = await obtenerCajaAbierta()

  if (!caja) {
    return (
      <div className="space-y-4 max-w-md mx-auto mt-16">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Caja diaria</h1>
          <p className="text-sm text-muted-foreground mt-1">No hay caja abierta</p>
        </div>
        <div className="border rounded-lg p-6 space-y-4">
          <h2 className="font-semibold">Abrir caja</h2>
          <FormAperturaCaja onSubmit={abrirCaja} />
        </div>
        <div className="text-center">
          <Link href="/caja/historial" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            <History className="h-4 w-4 mr-1" />
            Ver historial
          </Link>
        </div>
      </div>
    )
  }

  const [movimientos, cuentas] = [caja.movimientos, await obtenerCuentasConSaldo()]

  const sumar = (tipo: TipoMovCaja) =>
    movimientos.filter((m) => m.tipo === tipo).reduce((a, m) => a + Number(m.monto), 0)

  const totalIngresos  = sumar("CONTADO_HABER")
  const totalEgresos   = sumar("CONTADO_DEBE")
  const totalHaber     = sumar("CC_HABER")
  const totalDebe      = sumar("CC_DEBE")

  const saldoCaja     = Number(caja.saldoInicial) + totalIngresos - totalEgresos
  const diferenciaCaja = totalIngresos - totalEgresos
  const netoCC        = totalHaber - totalDebe

  // Saldo total CTA CTE de todas las cuentas en la base
  const saldoCtaCte = cuentas
    .filter((c) => c.titular === "CLIENTE")
    .reduce((acc, c) => acc + Number(c.saldo), 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Caja diaria</h1>
          <p className="text-sm text-muted-foreground">
            Abierta por {caja.abiertaPor.nombre} ·{" "}
            {new Date(caja.fechaApertura).toLocaleString("es-AR", {
              day: "2-digit", month: "2-digit", year: "numeric",
              hour: "2-digit", minute: "2-digit",
            })}
          </p>
        </div>
        <Link href="/caja/historial" className={buttonVariants({ variant: "outline", size: "sm" })}>
          <History className="h-4 w-4 mr-1" />
          Historial
        </Link>
      </div>

      {/* 4 columnas contables */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="border rounded-lg p-4 bg-green-50/60">
          <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">Ingresos</p>
          <p className="text-xl font-bold text-green-700">{formatearPesos(totalIngresos)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Efectivo entrada</p>
        </div>
        <div className="border rounded-lg p-4 bg-red-50/60">
          <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-1">Egresos</p>
          <p className="text-xl font-bold text-red-700">{formatearPesos(totalEgresos)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Efectivo salida</p>
        </div>
        <div className="border rounded-lg p-4 bg-orange-50/60">
          <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide mb-1">Debe CC</p>
          <p className="text-xl font-bold text-orange-700">{formatearPesos(totalDebe)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Compras / pagos</p>
        </div>
        <div className="border rounded-lg p-4 bg-blue-50/60">
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">Haber CC</p>
          <p className="text-xl font-bold text-blue-700">{formatearPesos(totalHaber)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Cobros clientes</p>
        </div>
      </div>

      {/* Saldos calculados */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="border rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-1">Saldo inicial</p>
          <p className="text-lg font-semibold">{formatearPesos(Number(caja.saldoInicial))}</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-1">Saldo caja (efectivo)</p>
          <p className={cn("text-lg font-bold", saldoCaja >= 0 ? "text-green-700" : "text-destructive")}>
            {formatearPesos(saldoCaja)}
          </p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-1">Diferencia de caja</p>
          <p className={cn("text-lg font-bold", diferenciaCaja >= 0 ? "text-green-700" : "text-destructive")}>
            {diferenciaCaja >= 0 ? "+" : ""}{formatearPesos(diferenciaCaja)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Ingresos − Egresos del día</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-1">Neto CC del día</p>
          <p className={cn("text-lg font-bold", netoCC >= 0 ? "text-blue-700" : "text-orange-700")}>
            {formatearPesos(netoCC)}
          </p>
        </div>
      </div>

      {/* Saldo CTA CTE acumulado */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="border rounded-lg p-4 bg-blue-50/30">
          <p className="text-xs text-muted-foreground mb-1">Saldo CTA CTE clientes (acumulado)</p>
          <p className={cn("text-2xl font-bold", saldoCtaCte > 0 ? "text-destructive" : "text-green-700")}>
            {formatearPesos(saldoCtaCte)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {saldoCtaCte > 0 ? "Los clientes nos deben en total" : "Sin saldo pendiente"}
          </p>
        </div>
      </div>

      {/* Tabla + sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 border rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-muted/40 border-b font-semibold text-sm">
            Movimientos del día ({movimientos.length})
          </div>
          {movimientos.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Sin movimientos registrados todavía.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/20">
                  <tr>
                    <th className="text-left px-3 py-2 text-muted-foreground font-medium w-8">#</th>
                    <th className="text-left px-3 py-2 text-muted-foreground font-medium">Concepto</th>
                    <th className="text-right px-3 py-2 text-green-700 font-medium">Ingresos</th>
                    <th className="text-right px-3 py-2 text-red-700 font-medium">Egresos</th>
                    <th className="text-right px-3 py-2 text-orange-700 font-medium">Debe</th>
                    <th className="text-right px-3 py-2 text-blue-700 font-medium">Haber</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {movimientos.map((m, i) => {
                    const monto = Number(m.monto)
                    const esIngreso  = m.tipo === "CONTADO_HABER"
                    const esEgreso   = m.tipo === "CONTADO_DEBE"
                    const esDebe     = m.tipo === "CC_DEBE"
                    const esHaber    = m.tipo === "CC_HABER"
                    return (
                      <tr key={m.id} className="hover:bg-muted/10">
                        <td className="px-3 py-2 text-muted-foreground tabular-nums">{i + 1}</td>
                        <td className="px-3 py-2">
                          <p className="font-medium truncate max-w-[220px]">{m.descripcion}</p>
                          <p className="text-xs text-muted-foreground">
                            {etiquetasCategoria[m.categoria as CategoriaMovCaja] ?? m.categoria} · {m.usuario.nombre}
                          </p>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-green-700 font-semibold">
                          {esIngreso ? formatearPesos(monto) : ""}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-red-700 font-semibold">
                          {esEgreso ? formatearPesos(monto) : ""}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-orange-700 font-semibold">
                          {esDebe ? formatearPesos(monto) : ""}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-blue-700 font-semibold">
                          {esHaber ? formatearPesos(monto) : ""}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="border-t bg-muted/20 font-semibold">
                  <tr>
                    <td colSpan={2} className="px-3 py-2 text-right text-muted-foreground text-xs">Totales</td>
                    <td className="px-3 py-2 text-right tabular-nums text-green-700">{formatearPesos(totalIngresos)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-red-700">{formatearPesos(totalEgresos)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-orange-700">{formatearPesos(totalDebe)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-blue-700">{formatearPesos(totalHaber)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-sm mb-3">Nuevo movimiento</h3>
            <FormMovimiento
              onSubmit={async (data) => {
                "use server"
                return registrarMovimiento(caja.id, data)
              }}
            />
          </div>
          <div className="border border-destructive/30 rounded-lg p-4">
            <h3 className="font-semibold text-sm mb-3 text-destructive">Cerrar caja</h3>
            <FormCierreCaja
              saldoEsperado={saldoCaja}
              totalContadoHaber={totalIngresos}
              totalContadoDebe={totalEgresos}
              totalCCHaber={totalHaber}
              totalCCDebe={totalDebe}
              onSubmit={async (data) => {
                "use server"
                return cerrarCaja(caja.id, data)
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
