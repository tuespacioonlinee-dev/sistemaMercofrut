import Link from "next/link"
import { notFound } from "next/navigation"
import { obtenerCuentaPorId } from "@/server/actions/cuentas"
import { Badge } from "@/components/ui/badge"
import { etiquetasTipoCuenta } from "@/lib/validaciones/cuentas"
import { formatearPesos } from "@/lib/utils"
import { ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
  params: Promise<{ id: string }>
}

const etiquetasTipoMov: Record<string, string> = {
  DEBE: "Débito",
  HABER: "Crédito",
  AJUSTE: "Ajuste",
}

export default async function DetalleCuentaPage({ params }: Props) {
  const { id } = await params
  const cuenta = await obtenerCuentaPorId(id)

  if (!cuenta) notFound()

  const saldo = Number(cuenta.saldo)

  return (
    <div className="p-6 space-y-6">
      {/* Migas de pan */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/cuentas" className="flex items-center gap-1 hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" />
          Cuentas
        </Link>
        <span>/</span>
        <span className="text-foreground">{cuenta.nombre}</span>
      </div>

      {/* Encabezado con resumen */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">{cuenta.cliente?.nombreRazonSocial ?? "Cuenta"}</h1>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{etiquetasTipoCuenta[cuenta.tipo]}</Badge>
            <span className="text-sm text-muted-foreground">{cuenta.nombre}</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Saldo actual</p>
          <p className={cn(
            "text-3xl font-bold tabular-nums",
            saldo > 0 ? "text-destructive" : saldo < 0 ? "text-green-600" : "text-foreground"
          )}>
            {formatearPesos(saldo)}
          </p>
          {saldo > 0 && <p className="text-xs text-destructive">Debe al negocio</p>}
          {saldo < 0 && <p className="text-xs text-green-600">A favor del cliente</p>}
          {saldo === 0 && <p className="text-xs text-muted-foreground">Sin saldo pendiente</p>}
        </div>
      </div>

      {/* Movimientos */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold">Últimos movimientos</h2>

        {cuenta.movimientos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg bg-muted/30">
            <p className="text-muted-foreground font-medium">No hay movimientos todavía.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Los movimientos se registran automáticamente al crear ventas o cobros.
            </p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Fecha</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Descripción</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Tipo</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Monto</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Saldo posterior</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {cuenta.movimientos.map((mov) => (
                  <tr key={mov.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {new Date(mov.fecha).toLocaleDateString("es-AR")}
                    </td>
                    <td className="px-4 py-3">{mov.descripcion}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "font-normal",
                          mov.tipo === "DEBE" && "bg-red-50 text-red-700",
                          mov.tipo === "HABER" && "bg-green-50 text-green-700"
                        )}
                      >
                        {etiquetasTipoMov[mov.tipo]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      {formatearPesos(Number(mov.monto))}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">
                      {formatearPesos(Number(mov.saldoPosterior))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
