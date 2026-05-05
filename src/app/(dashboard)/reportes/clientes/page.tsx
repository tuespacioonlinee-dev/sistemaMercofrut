import { obtenerReporteClientes } from "@/server/actions/reportes"
import { formatearPesos } from "@/lib/utils"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export const dynamic = "force-dynamic"

interface Props {
  searchParams: Promise<{ filtro?: string }>
}

export default async function ReporteClientesPage({ searchParams }: Props) {
  const { filtro } = await searchParams
  const todos = await obtenerReporteClientes()

  const clientes = todos.filter((c) => {
    if (filtro === "saldo") {
      const saldo = c.cuentas.reduce((acc, cu) => acc + Number(cu.saldo), 0)
      return saldo > 0
    }
    return true
  })

  const totalSaldo = todos.reduce(
    (acc, c) => acc + c.cuentas.reduce((a, cu) => a + Number(cu.saldo), 0),
    0
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/reportes" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Reportes
        </Link>
        <h1 className="text-2xl font-bold">Reporte de Clientes</h1>
      </div>

      <div className="flex items-center justify-between">
        <div className="border rounded-lg p-4 inline-block">
          <p className="text-xs text-muted-foreground">Total deuda clientes</p>
          <p className={cn("text-2xl font-bold mt-1", totalSaldo > 0 ? "text-destructive" : "text-muted-foreground")}>
            {formatearPesos(totalSaldo)}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/reportes/clientes" className={cn(buttonVariants({ variant: !filtro ? "default" : "outline", size: "sm" }), "h-7 px-3 text-xs")}>
            Todos ({todos.length})
          </Link>
          <Link href="/reportes/clientes?filtro=saldo" className={cn(buttonVariants({ variant: filtro === "saldo" ? "default" : "outline", size: "sm" }), "h-7 px-3 text-xs")}>
            Con saldo
          </Link>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">#</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Nombre / Razón Social</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Documento</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">IVA</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Tel.</th>
              <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Saldo CC</th>
              <th className="text-right px-4 py-3 font-semibold text-muted-foreground"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {clientes.map((c, i) => {
              const saldo = c.cuentas.reduce((acc, cu) => acc + Number(cu.saldo), 0)
              return (
                <tr key={c.id} className="hover:bg-muted/20">
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">{i + 1}</td>
                  <td className="px-4 py-2.5 font-medium">{c.nombreRazonSocial}</td>
                  <td className="px-4 py-2.5 text-muted-foreground font-mono text-xs">{c.documento}</td>
                  <td className="px-4 py-2.5">
                    <Badge variant="secondary" className="text-xs font-normal">
                      {c.condicionIva.replace(/_/g, " ")}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">{c.telefono ?? "—"}</td>
                  <td className={cn(
                    "px-4 py-2.5 text-right font-semibold tabular-nums",
                    saldo > 0 ? "text-destructive" : saldo < 0 ? "text-green-600" : "text-muted-foreground"
                  )}>
                    {c.cuentas.length > 0 ? formatearPesos(saldo) : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {c.cuentas.length > 0 && saldo > 0 && (
                      <Link
                        href={`/reportes/cuentas?cuentaId=${c.cuentas[0].saldo !== undefined ? "" : ""}`}
                        className={buttonVariants({ variant: "ghost", size: "sm" })}
                      >
                        Ver movs
                      </Link>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
