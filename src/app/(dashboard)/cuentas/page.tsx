import Link from "next/link"
import { obtenerCuentas } from "@/server/actions/cuentas"
import { buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { etiquetasTipoCuenta } from "@/lib/validaciones/cuentas"
import { formatearPesos } from "@/lib/utils"
import { PlusCircle, Eye, HandCoins, Wallet } from "lucide-react"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

interface Props {
  searchParams: Promise<{ filtro?: string; titular?: string }>
}

export default async function CuentasPage({ searchParams }: Props) {
  const { filtro, titular } = await searchParams
  const todas = await obtenerCuentas()

  const cuentas = todas.filter((c) => {
    const saldo = Number(c.saldo)
    if (filtro === "saldo" && saldo <= 0) return false
    if (titular === "CLIENTE" && c.titular !== "CLIENTE") return false
    if (titular === "PROVEEDOR" && c.titular !== "PROVEEDOR") return false
    return true
  })

  const totalSaldoClientes = todas
    .filter((c) => c.titular === "CLIENTE")
    .reduce((acc, c) => acc + Number(c.saldo), 0)
  const totalSaldoProveedores = todas
    .filter((c) => c.titular === "PROVEEDOR")
    .reduce((acc, c) => acc + Number(c.saldo), 0)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cuentas corrientes</h1>
          <p className="text-sm text-muted-foreground">
            {cuentas.length} cuenta{cuentas.length !== 1 ? "s" : ""} {filtro === "saldo" ? "con saldo" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/cobros/nuevo" className={buttonVariants({ variant: "outline" })}>
            <HandCoins className="h-4 w-4 mr-2" />
            Cobrar
          </Link>
          <Link href="/pagos/nuevo" className={buttonVariants({ variant: "outline" })}>
            <Wallet className="h-4 w-4 mr-2" />
            Pagar
          </Link>
          <Link href="/cuentas/nueva" className={buttonVariants()}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Nueva cuenta
          </Link>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-4">
        <div className="border rounded-lg p-4 bg-muted/20">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Clientes nos deben</p>
          <p className={cn(
            "text-2xl font-bold tabular-nums mt-1",
            totalSaldoClientes > 0 ? "text-destructive" : "text-muted-foreground"
          )}>
            {formatearPesos(totalSaldoClientes)}
          </p>
        </div>
        <div className="border rounded-lg p-4 bg-muted/20">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Debemos a proveedores</p>
          <p className={cn(
            "text-2xl font-bold tabular-nums mt-1",
            totalSaldoProveedores > 0 ? "text-destructive" : "text-muted-foreground"
          )}>
            {formatearPesos(totalSaldoProveedores)}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">Filtrar:</span>
        <Link
          href="/cuentas"
          className={cn(
            buttonVariants({ variant: !filtro && !titular ? "default" : "outline", size: "sm" }),
            "h-7 px-3 text-xs"
          )}
        >
          Todas
        </Link>
        <Link
          href="/cuentas?filtro=saldo"
          className={cn(
            buttonVariants({ variant: filtro === "saldo" && !titular ? "default" : "outline", size: "sm" }),
            "h-7 px-3 text-xs"
          )}
        >
          Con saldo
        </Link>
        <Link
          href="/cuentas?titular=CLIENTE&filtro=saldo"
          className={cn(
            buttonVariants({ variant: titular === "CLIENTE" ? "default" : "outline", size: "sm" }),
            "h-7 px-3 text-xs"
          )}
        >
          Clientes con saldo
        </Link>
        <Link
          href="/cuentas?titular=PROVEEDOR&filtro=saldo"
          className={cn(
            buttonVariants({ variant: titular === "PROVEEDOR" ? "default" : "outline", size: "sm" }),
            "h-7 px-3 text-xs"
          )}
        >
          Proveedores con saldo
        </Link>
      </div>

      {cuentas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border rounded-lg bg-muted/30">
          <p className="text-muted-foreground font-medium">
            {filtro || titular ? "No hay cuentas que coincidan con el filtro." : "No hay cuentas registradas todavía."}
          </p>
          {!filtro && !titular && (
            <p className="text-sm text-muted-foreground mt-1">
              Las cuentas se crean automáticamente al registrar ventas o compras.
            </p>
          )}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Titular</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Rol</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Tipo</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Saldo</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {cuentas.map((cuenta) => {
                const saldo = Number(cuenta.saldo)
                const titularNombre =
                  cuenta.titular === "CLIENTE"
                    ? cuenta.cliente?.nombreRazonSocial
                    : cuenta.titular === "PROVEEDOR"
                    ? cuenta.proveedor?.nombreRazonSocial
                    : cuenta.nombre
                return (
                  <tr key={cuenta.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium">{titularNombre ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="font-normal">
                        {cuenta.titular === "CLIENTE" ? "Cliente" : cuenta.titular === "PROVEEDOR" ? "Proveedor" : "Propia"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {etiquetasTipoCuenta[cuenta.tipo]}
                    </td>
                    <td className={cn(
                      "px-4 py-3 text-right font-semibold tabular-nums",
                      saldo > 0 ? "text-destructive" : saldo < 0 ? "text-green-600" : "text-muted-foreground"
                    )}>
                      {formatearPesos(saldo)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {cuenta.tipo === "CORRIENTE" && saldo > 0 && cuenta.titular === "CLIENTE" && (
                          <Link
                            href={`/cobros/nuevo?cuentaId=${cuenta.id}`}
                            className={buttonVariants({ variant: "outline", size: "sm" })}
                          >
                            <HandCoins className="h-4 w-4 mr-1" />
                            Cobrar
                          </Link>
                        )}
                        {cuenta.tipo === "CORRIENTE" && saldo > 0 && cuenta.titular === "PROVEEDOR" && (
                          <Link
                            href={`/pagos/nuevo?cuentaId=${cuenta.id}`}
                            className={buttonVariants({ variant: "outline", size: "sm" })}
                          >
                            <Wallet className="h-4 w-4 mr-1" />
                            Pagar
                          </Link>
                        )}
                        <Link
                          href={`/cuentas/${cuenta.id}`}
                          className={buttonVariants({ variant: "ghost", size: "sm" })}
                        >
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">Ver detalle</span>
                        </Link>
                      </div>
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
