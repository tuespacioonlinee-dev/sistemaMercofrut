import { obtenerCajaAbierta } from "@/server/actions/caja"
import { abrirCaja, cerrarCaja, registrarMovimiento } from "@/server/actions/caja"
import { formatearPesos } from "@/lib/utils"
import { cn } from "@/lib/utils"
import {
  etiquetasCategoria,
  etiquetasTipo,
  type TipoMovCaja,
  type CategoriaMovCaja,
} from "@/lib/validaciones/caja"
import { FormAperturaCaja } from "./FormAperturaCaja"
import { FormMovimiento } from "./FormMovimiento"
import { FormCierreCaja } from "./FormCierreCaja"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { History } from "lucide-react"

export const dynamic = "force-dynamic"

const colorTipo: Record<TipoMovCaja, string> = {
  CONTADO_HABER: "text-green-700 bg-green-50",
  CONTADO_DEBE:  "text-red-700 bg-red-50",
  CC_HABER:      "text-blue-700 bg-blue-50",
  CC_DEBE:       "text-orange-700 bg-orange-50",
}

export default async function CajaPage() {
  const caja = await obtenerCajaAbierta()

  // ── Sin caja abierta ──────────────────────────────────────────────────────
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

  // ── Calcular subtotales por columna ───────────────────────────────────────
  const movimientos = caja.movimientos

  const sumar = (tipo: TipoMovCaja) =>
    movimientos.filter((m) => m.tipo === tipo).reduce((a, m) => a + Number(m.monto), 0)

  const totalContadoHaber = sumar("CONTADO_HABER")
  const totalContadoDebe  = sumar("CONTADO_DEBE")
  const totalCCHaber      = sumar("CC_HABER")
  const totalCCDebe       = sumar("CC_DEBE")

  const saldoActual =
    Number(caja.saldoInicial) + totalContadoHaber - totalContadoDebe
  const saldoCC = totalCCHaber - totalCCDebe

  return (
    <div className="space-y-5">
      {/* Header */}
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
          <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">Contado HABER</p>
          <p className="text-xl font-bold text-green-700">{formatearPesos(totalContadoHaber)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Ingresos efectivo</p>
        </div>
        <div className="border rounded-lg p-4 bg-red-50/60">
          <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-1">Contado DEBE</p>
          <p className="text-xl font-bold text-red-700">{formatearPesos(totalContadoDebe)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Egresos efectivo</p>
        </div>
        <div className="border rounded-lg p-4 bg-blue-50/60">
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">CC HABER</p>
          <p className="text-xl font-bold text-blue-700">{formatearPesos(totalCCHaber)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Cobros en CC</p>
        </div>
        <div className="border rounded-lg p-4 bg-orange-50/60">
          <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide mb-1">CC DEBE</p>
          <p className="text-xl font-bold text-orange-700">{formatearPesos(totalCCDebe)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Pagos en CC</p>
        </div>
      </div>

      {/* Saldos calculados */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="border rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-1">Saldo inicial</p>
          <p className="text-lg font-semibold">{formatearPesos(Number(caja.saldoInicial))}</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-1">Saldo caja (efectivo)</p>
          <p className={cn("text-lg font-bold", saldoActual >= 0 ? "text-green-700" : "text-destructive")}>
            {formatearPesos(saldoActual)}
          </p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-1">Neto cuenta corriente</p>
          <p className={cn("text-lg font-bold", saldoCC >= 0 ? "text-blue-700" : "text-orange-700")}>
            {formatearPesos(saldoCC)}
          </p>
        </div>
      </div>

      {/* Tabla + sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Movimientos */}
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
                    <th className="text-left px-3 py-2 text-muted-foreground font-medium">Hora</th>
                    <th className="text-left px-3 py-2 text-muted-foreground font-medium">Categoría</th>
                    <th className="text-left px-3 py-2 text-muted-foreground font-medium">Columna</th>
                    <th className="text-left px-3 py-2 text-muted-foreground font-medium">Descripción</th>
                    <th className="text-left px-3 py-2 text-muted-foreground font-medium">Usuario</th>
                    <th className="text-right px-3 py-2 text-muted-foreground font-medium">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {movimientos.map((m) => (
                    <tr key={m.id} className="hover:bg-muted/10">
                      <td className="px-3 py-2 tabular-nums text-muted-foreground whitespace-nowrap">
                        {new Date(m.fecha).toLocaleTimeString("es-AR", {
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground text-xs">
                        {etiquetasCategoria[m.categoria as CategoriaMovCaja] ?? m.categoria}
                      </td>
                      <td className="px-3 py-2">
                        <span className={cn(
                          "text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap",
                          colorTipo[m.tipo as TipoMovCaja]
                        )}>
                          {etiquetasTipo[m.tipo as TipoMovCaja] ?? m.tipo}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground max-w-[160px] truncate">
                        {m.descripcion}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground text-xs">{m.usuario.nombre}</td>
                      <td className={cn(
                        "px-3 py-2 text-right tabular-nums font-semibold",
                        m.tipo === "CONTADO_HABER" || m.tipo === "CC_HABER"
                          ? "text-green-700"
                          : "text-red-700"
                      )}>
                        {formatearPesos(Number(m.monto))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Sidebar */}
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
              saldoEsperado={saldoActual}
              totalContadoHaber={totalContadoHaber}
              totalContadoDebe={totalContadoDebe}
              totalCCHaber={totalCCHaber}
              totalCCDebe={totalCCDebe}
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
