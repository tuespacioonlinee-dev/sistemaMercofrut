import Link from "next/link"
import { obtenerCuentas } from "@/server/actions/cuentas"
import { buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { etiquetasTipoCuenta } from "@/lib/validaciones/cuentas"
import { formatearPesos } from "@/lib/utils"
import { PlusCircle, Eye } from "lucide-react"
import { cn } from "@/lib/utils"

export default async function CuentasPage() {
  const cuentas = await obtenerCuentas()

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cuentas corrientes</h1>
          <p className="text-sm text-muted-foreground">
            {cuentas.length} cuenta{cuentas.length !== 1 ? "s" : ""} registrada{cuentas.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/cuentas/nueva" className={buttonVariants()}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Nueva cuenta
        </Link>
      </div>

      {cuentas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border rounded-lg bg-muted/30">
          <p className="text-muted-foreground font-medium">No hay cuentas registradas todavía.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Las cuentas se crean automáticamente al registrar ventas, o podés crear una manualmente.
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Cliente</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Tipo</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Nombre de cuenta</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Saldo</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {cuentas.map((cuenta) => {
                const saldo = Number(cuenta.saldo)
                return (
                  <tr key={cuenta.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium">
                      {cuenta.cliente?.nombreRazonSocial ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="font-normal">
                        {etiquetasTipoCuenta[cuenta.tipo]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{cuenta.nombre}</td>
                    <td className={cn(
                      "px-4 py-3 text-right font-semibold tabular-nums",
                      saldo > 0 ? "text-destructive" : saldo < 0 ? "text-green-600" : "text-muted-foreground"
                    )}>
                      {formatearPesos(saldo)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/cuentas/${cuenta.id}`}
                        className={buttonVariants({ variant: "ghost", size: "sm" })}
                      >
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">Ver detalle</span>
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
