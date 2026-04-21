import { obtenerLotes } from "@/server/actions/lotes"
import { LotesTable } from "./LotesTable"
import { differenceInDays, isPast } from "date-fns"
import { AlertTriangle, PackageX } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function LotesPage() {
  const lotes = await obtenerLotes()

  const vencidos = lotes.filter((l) => l.fechaVencimiento && isPast(new Date(l.fechaVencimiento)))
  const porVencer = lotes.filter((l) => {
    if (!l.fechaVencimiento || isPast(new Date(l.fechaVencimiento))) return false
    return differenceInDays(new Date(l.fechaVencimiento), new Date()) <= 7
  })

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Lotes activos</h1>
          <p className="text-sm text-muted-foreground">
            {lotes.length} lote{lotes.length !== 1 ? "s" : ""} en seguimiento
          </p>
        </div>
        <div className="flex gap-2">
          {vencidos.length > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700">
              <PackageX className="h-3.5 w-3.5" />
              {vencidos.length} vencido{vencidos.length > 1 ? "s" : ""}
            </div>
          )}
          {porVencer.length > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">
              <AlertTriangle className="h-3.5 w-3.5" />
              {porVencer.length} por vencer
            </div>
          )}
        </div>
      </div>

      <LotesTable lotes={lotes} />
    </div>
  )
}
