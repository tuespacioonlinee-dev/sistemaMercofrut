import { obtenerCajaAbierta } from "@/server/actions/caja"
import { formatearPesos } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { etiquetasCategoria } from "@/lib/validaciones/caja"
import { cn } from "@/lib/utils"
import { FormAperturaCaja } from "./FormAperturaCaja"
import { FormMovimiento } from "./FormMovimiento"
import { FormCierreCaja } from "./FormCierreCaja"
import { abrirCaja, cerrarCaja, registrarMovimiento } from "@/server/actions/caja"
import { DatosAperturaCaja, DatosCierreCaja, DatosMovimientoCaja } from "@/lib/validaciones/caja"
import Link from "next/link"
import { History } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"

export const dynamic = "force-dynamic"

export default async function CajaPage() {
  const caja = await obtenerCajaAbierta()

  // Calcular totales si hay caja abierta
  let totalIngresos = 0
  let totalEgresos = 0
  let saldoActual = 0

  if (caja) {
    totalIngresos = caja.movimientos
      .filter((m) => m.tipo === "INGRESO")
      .reduce((acc, m) => acc + Number(m.monto), 0)
    totalEgresos = caja.movimientos
      .filter((m) => m.tipo === "EGRESO")
      .reduce((acc, m) => acc + Number(m.monto), 0)
    saldoActual = Number(caja.saldoInicial) + totalIngresos - totalEgresos
  }

  async function accionAbrir(data: DatosAperturaCaja) {
    "use server"
    return abrirCaja(data)
  }

  async function accionCerrar(data: DatosCierreCaja) {
    "use server"
    return cerrarCaja(caja!.id, data)
  }

  async function accionMovimiento(data: DatosMovimientoCaja) {
    "use server"
    return registrarMovimiento(caja!.id, data)
  }

  // Sin caja abierta → mostrar formulario de apertura
  if (!caja) {
    return (
      <div className="space-y-6 max-w-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Caja diaria</h1>
            <p className="text-sm text-muted-foreground">No hay ninguna caja abierta hoy.</p>
          </div>
          <Link href="/caja/historial" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <History className="h-4 w-4 mr-2" />
            Historial
          </Link>
        </div>

        <div className="border rounded-lg p-6 space-y-4">
          <h2 className="text-base font-semibold">Abrir caja del día</h2>
          <p className="text-sm text-muted-foreground">
            Ingresá el saldo con el que arranca la caja (efectivo disponible).
          </p>
          <FormAperturaCaja onSubmit={accionAbrir} />
        </div>
      </div>
    )
  }

  // Caja abierta → mostrar panel completo
  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Caja diaria</h1>
          <p className="text-sm text-muted-foreground">
            Abierta el {new Date(caja.fechaApertura).toLocaleDateString("es-AR", {
              weekday: "long", year: "numeric", month: "long", day: "numeric",
            })} por {caja.abiertaPor.nombre}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/caja/historial" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <History className="h-4 w-4 mr-2" />
            Historial
          </Link>
          <Badge variant="secondary" className="bg-green-50 text-green-700">Abierta</Badge>
        </div>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-4 gap-4">
        <div className="border rounded-lg p-4 space-y-1">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Saldo inicial</p>
          <p className="text-2xl font-bold tabular-nums">{formatearPesos(Number(caja.saldoInicial))}</p>
        </div>
        <div className="border rounded-lg p-4 space-y-1 bg-green-50">
          <p className="text-xs text-green-700 font-medium uppercase tracking-wide">Ingresos</p>
          <p className="text-2xl font-bold text-green-700 tabular-nums">+ {formatearPesos(totalIngresos)}</p>
        </div>
        <div className="border rounded-lg p-4 space-y-1 bg-red-50">
          <p className="text-xs text-red-700 font-medium uppercase tracking-wide">Egresos</p>
          <p className="text-2xl font-bold text-red-700 tabular-nums">- {formatearPesos(totalEgresos)}</p>
        </div>
        <div className="border rounded-lg p-4 space-y-1 bg-blue-50">
          <p className="text-xs text-blue-700 font-medium uppercase tracking-wide">Saldo actual</p>
          <p className="text-2xl font-bold text-blue-700 tabular-nums">{formatearPesos(saldoActual)}</p>
        </div>
      </div>

      {/* Cuerpo: movimientos + acciones */}
      <div className="grid grid-cols-[1fr_320px] gap-6 items-start">
        {/* Movimientos del día */}
        <div className="space-y-3">
          <h2 className="text-base font-semibold">Movimientos del día</h2>
          {caja.movimientos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 border rounded-lg bg-muted/30 text-center">
              <p className="text-muted-foreground font-medium">Sin movimientos todavía.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Las ventas al contado se registran automáticamente.
              </p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Hora</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Categoría</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Descripción</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Usuario</th>
                    <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {caja.movimientos.map((mov) => (
                    <tr key={mov.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap tabular-nums">
                        {new Date(mov.fecha).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "font-normal text-xs",
                            mov.tipo === "INGRESO" && "bg-green-50 text-green-700",
                            mov.tipo === "EGRESO" && "bg-red-50 text-red-700"
                          )}
                        >
                          {etiquetasCategoria[mov.categoria]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{mov.descripcion}</td>
                      <td className="px-4 py-3 text-muted-foreground">{mov.usuario.nombre}</td>
                      <td className={cn(
                        "px-4 py-3 text-right font-semibold tabular-nums",
                        mov.tipo === "INGRESO" ? "text-green-700" : "text-red-700"
                      )}>
                        {mov.tipo === "INGRESO" ? "+" : "-"} {formatearPesos(Number(mov.monto))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Panel lateral: nuevo movimiento + cierre */}
        <div className="space-y-4">
          <div className="border rounded-lg p-4 space-y-3">
            <h2 className="text-base font-semibold">Registrar movimiento</h2>
            <FormMovimiento onSubmit={accionMovimiento} />
          </div>

          <div className="border rounded-lg p-4 space-y-3 border-destructive/30 bg-destructive/5">
            <h2 className="text-base font-semibold text-destructive">Cerrar caja</h2>
            <p className="text-xs text-muted-foreground">
              Ingresá el dinero que contaste físicamente. El sistema calcula la diferencia.
            </p>
            <FormCierreCaja saldoEsperado={saldoActual} onSubmit={accionCerrar} />
          </div>
        </div>
      </div>
    </div>
  )
}
