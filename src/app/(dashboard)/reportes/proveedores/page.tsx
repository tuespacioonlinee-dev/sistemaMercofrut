import { obtenerReporteProveedores } from "@/server/actions/reportes"
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

export default async function ReporteProveedoresPage({ searchParams }: Props) {
  const { filtro } = await searchParams
  const todos = await obtenerReporteProveedores()

  const proveedores = todos.filter((p) => {
    if (filtro === "saldo") {
      const saldo = p.cuentas.reduce((acc, c) => acc + Number(c.saldo), 0)
      return saldo > 0
    }
    return true
  })

  const totalSaldo = todos.reduce(
    (acc, p) => acc + p.cuentas.reduce((a, c) => a + Number(c.saldo), 0),
    0
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/reportes" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Reportes
        </Link>
        <h1 className="text-2xl font-bold">Reporte de Proveedores</h1>
      </div>

      <div className="flex items-center justify-between">
        <div className="border rounded-lg p-4 inline-block">
          <p className="text-xs text-muted-foreground">Total deuda a proveedores</p>
          <p className={cn("text-2xl font-bold mt-1", totalSaldo > 0 ? "text-destructive" : "text-muted-foreground")}>
            {formatearPesos(totalSaldo)}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/reportes/proveedores" className={cn(buttonVariants({ variant: !filtro ? "default" : "outline", size: "sm" }), "h-7 px-3 text-xs")}>
            Todos ({todos.length})
          </Link>
          <Link href="/reportes/proveedores?filtro=saldo" className={cn(buttonVariants({ variant: filtro === "saldo" ? "default" : "outline", size: "sm" }), "h-7 px-3 text-xs")}>
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
              <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Deuda CC</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {proveedores.map((p, i) => {
              const saldo = p.cuentas.reduce((acc, c) => acc + Number(c.saldo), 0)
              return (
                <tr key={p.id} className="hover:bg-muted/20">
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">{i + 1}</td>
                  <td className="px-4 py-2.5 font-medium">{p.nombreRazonSocial}</td>
                  <td className="px-4 py-2.5 text-muted-foreground font-mono text-xs">{p.documento}</td>
                  <td className="px-4 py-2.5">
                    <Badge variant="secondary" className="text-xs font-normal">
                      {p.condicionIva.replace(/_/g, " ")}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">{p.telefono ?? "—"}</td>
                  <td className={cn(
                    "px-4 py-2.5 text-right font-semibold tabular-nums",
                    saldo > 0 ? "text-destructive" : saldo < 0 ? "text-green-600" : "text-muted-foreground"
                  )}>
                    {p.cuentas.length > 0 ? formatearPesos(saldo) : "—"}
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
