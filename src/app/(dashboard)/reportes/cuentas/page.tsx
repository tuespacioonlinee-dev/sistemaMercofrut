import { obtenerCuentasConSaldo, obtenerMovimientosCuenta } from "@/server/actions/reportes"
import { formatearPesos } from "@/lib/utils"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export const dynamic = "force-dynamic"

interface Props {
  searchParams: Promise<{ cuentaId?: string; filtro?: string }>
}

export default async function ReporteCuentasPage({ searchParams }: Props) {
  const { cuentaId, filtro } = await searchParams

  const todasCuentas = await obtenerCuentasConSaldo()

  const cuentas = todasCuentas.filter((c) => {
    const saldo = Number(c.saldo)
    if (filtro === "clientes_saldo") return c.titular === "CLIENTE" && saldo > 0
    if (filtro === "proveedores_saldo") return c.titular === "PROVEEDOR" && saldo > 0
    if (filtro === "clientes") return c.titular === "CLIENTE"
    if (filtro === "proveedores") return c.titular === "PROVEEDOR"
    return true
  })

  const cuentaSeleccionada = cuentaId
    ? todasCuentas.find((c) => c.id === cuentaId)
    : null

  const movimientos = cuentaId ? await obtenerMovimientosCuenta(cuentaId) : []

  const totalCliSaldo = todasCuentas
    .filter((c) => c.titular === "CLIENTE")
    .reduce((acc, c) => acc + Number(c.saldo), 0)
  const totalProvSaldo = todasCuentas
    .filter((c) => c.titular === "PROVEEDOR")
    .reduce((acc, c) => acc + Number(c.saldo), 0)

  const filtros = [
    { key: "",                    label: "Todas" },
    { key: "clientes_saldo",      label: "Clientes c/saldo" },
    { key: "proveedores_saldo",   label: "Proveedores c/saldo" },
    { key: "clientes",            label: "Todos clientes" },
    { key: "proveedores",         label: "Todos proveedores" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/reportes" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Reportes
        </Link>
        <h1 className="text-2xl font-bold">Cuentas Corrientes</h1>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-4">
        <div className="border rounded-lg p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Clientes nos deben</p>
          <p className={cn("text-2xl font-bold mt-1", totalCliSaldo > 0 ? "text-destructive" : "text-muted-foreground")}>
            {formatearPesos(totalCliSaldo)}
          </p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Debemos a proveedores</p>
          <p className={cn("text-2xl font-bold mt-1", totalProvSaldo > 0 ? "text-destructive" : "text-muted-foreground")}>
            {formatearPesos(totalProvSaldo)}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2 flex-wrap">
        {filtros.map((f) => (
          <Link
            key={f.key}
            href={`/reportes/cuentas?filtro=${f.key}`}
            className={cn(
              buttonVariants({ variant: filtro === f.key || (!filtro && !f.key) ? "default" : "outline", size: "sm" }),
              "h-7 px-3 text-xs"
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lista de cuentas */}
        <div className="border rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-muted/40 border-b font-semibold text-sm">
            {cuentas.length} cuenta{cuentas.length !== 1 ? "s" : ""}
          </div>
          <div className="divide-y max-h-[600px] overflow-y-auto">
            {cuentas.map((c) => {
              const saldo = Number(c.saldo)
              const nombre = c.titular === "CLIENTE"
                ? c.cliente?.nombreRazonSocial
                : c.proveedor?.nombreRazonSocial
              return (
                <Link
                  key={c.id}
                  href={`/reportes/cuentas?filtro=${filtro ?? ""}&cuentaId=${c.id}`}
                  className={cn(
                    "flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors text-sm",
                    c.id === cuentaId && "bg-primary/5 border-l-2 border-primary"
                  )}
                >
                  <div>
                    <p className="font-medium">{nombre ?? c.nombre}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="secondary" className="text-xs py-0 h-4">
                        {c.titular === "CLIENTE" ? "Cliente" : "Proveedor"}
                      </Badge>
                    </div>
                  </div>
                  <p className={cn(
                    "font-bold tabular-nums",
                    saldo > 0 ? "text-destructive" : saldo < 0 ? "text-green-600" : "text-muted-foreground"
                  )}>
                    {formatearPesos(saldo)}
                  </p>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Movimientos de la cuenta seleccionada */}
        <div className="border rounded-lg overflow-hidden">
          {!cuentaSeleccionada ? (
            <div className="p-12 text-center text-muted-foreground text-sm">
              Seleccioná una cuenta para ver sus movimientos
            </div>
          ) : (
            <>
              <div className="px-4 py-3 bg-muted/40 border-b">
                <p className="font-semibold text-sm">
                  {cuentaSeleccionada.cliente?.nombreRazonSocial
                    ?? cuentaSeleccionada.proveedor?.nombreRazonSocial
                    ?? cuentaSeleccionada.nombre}
                </p>
                <p className={cn(
                  "text-base font-bold",
                  Number(cuentaSeleccionada.saldo) > 0 ? "text-destructive" : "text-green-600"
                )}>
                  Saldo: {formatearPesos(Number(cuentaSeleccionada.saldo))}
                </p>
              </div>
              <div className="overflow-x-auto max-h-[540px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/20 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Fecha</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Concepto</th>
                      <th className="text-right px-3 py-2 font-medium text-red-700">Debe</th>
                      <th className="text-right px-3 py-2 font-medium text-green-700">Haber</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">Saldo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {movimientos.map((m) => (
                      <tr key={m.id} className="hover:bg-muted/10">
                        <td className="px-3 py-2 text-muted-foreground text-xs whitespace-nowrap">
                          {new Date(m.fecha).toLocaleDateString("es-AR")}
                        </td>
                        <td className="px-3 py-2">
                          <p className="truncate max-w-[160px]">{m.descripcion}</p>
                          <p className="text-xs text-muted-foreground">{m.usuario.nombre}</p>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-red-700 font-semibold">
                          {m.tipo === "DEBE" ? formatearPesos(Number(m.monto)) : ""}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-green-700 font-semibold">
                          {m.tipo === "HABER" ? formatearPesos(Number(m.monto)) : ""}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                          {formatearPesos(Number(m.saldoPosterior))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
