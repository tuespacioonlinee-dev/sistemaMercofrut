import { obtenerRemitos } from "@/server/actions/remitos"
import { formatearPesos } from "@/lib/utils"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus } from "lucide-react"

export const dynamic = "force-dynamic"

const estadoBadge: Record<string, { label: string; className: string }> = {
  EMITIDO: { label: "Emitido", className: "bg-green-100 text-green-700 hover:bg-green-100" },
  ANULADO: { label: "Anulado", className: "bg-red-100 text-red-700 hover:bg-red-100" },
}

export default async function RemitosPage() {
  const remitosRaw = await obtenerRemitos()

  const remitos = remitosRaw.map((r) => ({
    ...r,
    venta: {
      ...r.venta,
      total: Number(r.venta.total),
    },
  }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Remitos</h1>
          <p className="text-sm text-muted-foreground">{remitos.length} remito{remitos.length !== 1 ? "s" : ""} registrado{remitos.length !== 1 ? "s" : ""}</p>
        </div>
        <Link href="/remitos/nuevo" className={buttonVariants()}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo remito
        </Link>
      </div>

      {remitos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border rounded-lg bg-muted/30 text-center gap-3">
          <p className="text-muted-foreground font-medium">No hay remitos registrados todavía.</p>
          <Link href="/remitos/nuevo" className={buttonVariants({ variant: "outline" })}>
            Generar el primero
          </Link>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">N° Remito</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Fecha</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Cliente</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">N° Venta</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Total</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {remitos.map((r) => {
                const badge = estadoBadge[r.estado] ?? estadoBadge.EMITIDO
                return (
                  <tr
                    key={r.id}
                    className={cn(
                      "hover:bg-muted/20 transition-colors",
                      r.estado === "ANULADO" && "opacity-50"
                    )}
                  >
                    <td className="px-4 py-3 font-mono font-semibold">{r.numero}</td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground whitespace-nowrap">
                      {new Date(r.fecha).toLocaleDateString("es-AR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 font-medium">{r.venta.cliente.nombreRazonSocial}</td>
                    <td className="px-4 py-3 text-muted-foreground">#{r.venta.numero}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">
                      {formatearPesos(r.venta.total)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={cn("text-xs", badge.className)}>{badge.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/remitos/${r.id}`}
                        className={buttonVariants({ variant: "ghost", size: "sm" })}
                      >
                        Ver
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
